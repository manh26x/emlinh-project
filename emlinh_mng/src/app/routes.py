from flask import render_template, request, jsonify, session, send_file, abort, Response
from src.app.extensions import db, csrf
from src.services.flow_service import flow_service
from src.services.facebook_service import facebook_service
from src.services.chat_service import ChatService
from src.services.embedding_service import EmbeddingService
from src.app.models import Chat, Idea, Video
import threading
import uuid
import datetime
from datetime import datetime
import os
import mimetypes
from pathlib import Path

from flask_wtf.csrf import CSRFProtect
from flask_socketio import SocketIO, emit, join_room, leave_room

def safe_datetime_to_string(dt_obj):
    """Safely convert datetime object to string, return as-is if already string"""
    if dt_obj is None:
        return None
    if isinstance(dt_obj, datetime):
        return dt_obj.isoformat()
    return str(dt_obj)  # Return as string if not datetime

def register_routes(app, socketio=None):
    """Register all routes with the Flask app"""
    
    @app.route('/')
    def index():
        """Home page route"""
        return render_template('index.html')

    @app.route('/chat')
    def chat_page():
        """Chat page route"""
        return render_template('chat.html')

    @app.route('/videos')
    def videos_page():
        """Videos management page"""
        return render_template('videos.html')

    @app.route('/videos/<int:video_id>')
    def video_detail_page(video_id):
        """Video detail page"""
        video = Video.query.get_or_404(video_id)
        return render_template('video_detail.html', video=video)

    @app.route('/health')
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'database': 'connected' if db.engine else 'disconnected'
        })

    # Video management endpoints
    @app.route('/api/videos')
    @csrf.exempt
    def get_videos():
        """Lấy danh sách videos"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            status = request.args.get('status')
            
            query = Video.query
            
            if status:
                query = query.filter_by(status=status)
            
            videos = query.order_by(Video.created_at.desc())\
                        .paginate(page=page, per_page=per_page, error_out=False)
            
            return jsonify({
                'success': True,
                'videos': [video.to_dict() for video in videos.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': videos.total,
                    'pages': videos.pages
                }
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/videos/<int:video_id>')
    @csrf.exempt
    def get_video_detail(video_id):
        """Lấy thông tin chi tiết của một video"""
        try:
            video = Video.query.get_or_404(video_id)
            return jsonify({
                'success': True,
                'video': video.to_dict()
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/videos/<int:video_id>/file')
    def serve_video_file(video_id):
        """Serve video file trực tiếp"""
        try:
            video = Video.query.get_or_404(video_id)
            
            # Thử file path gốc
            if os.path.exists(video.file_path):
                return send_file(
                    video.file_path,
                    mimetype='video/mp4',
                    as_attachment=False,
                    download_name=video.file_name
                )
            
            # Thử tìm trong thư mục remotion output nếu file path gốc không tồn tại
            from .config import Config
            remotion_output_dir = Config.REMOTION_OUTPUT_DIR
            alternative_path = os.path.join(remotion_output_dir, video.file_name)
            
            if os.path.exists(alternative_path):
                # Cập nhật path trong database để lần sau không cần tìm
                video.file_path = alternative_path
                db.session.commit()
                
                return send_file(
                    alternative_path,
                    mimetype='video/mp4',
                    as_attachment=False,
                    download_name=video.file_name
                )
            
            # Nếu không tìm thấy file ở cả hai nơi
            abort(404, f"Video file not found at {video.file_path} or {alternative_path}")
            
        except Exception as e:
            print(f"Error serving video {video_id}: {str(e)}")
            abort(500, f"Error serving video: {str(e)}")

    @app.route('/api/videos/<int:video_id>', methods=['DELETE'])
    @csrf.exempt
    def delete_video(video_id):
        """Xóa video"""
        try:
            video = Video.query.get_or_404(video_id)
            
            # Xóa file nếu tồn tại
            if os.path.exists(video.file_path):
                os.remove(video.file_path)
            
            # Xóa thumbnail nếu có
            if video.thumbnail_path and os.path.exists(video.thumbnail_path):
                os.remove(video.thumbnail_path)
            
            db.session.delete(video)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Video đã được xóa thành công'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    # Chat endpoints - Exempt from CSRF
    @app.route('/api/chat/send', methods=['POST'])
    @csrf.exempt
    def send_chat_message():
        """Gửi tin nhắn chat và nhận phản hồi từ AI sử dụng Flow"""
        try:
            data = request.get_json()
            user_message = data.get('message', '').strip()
            session_id = data.get('session_id')
            message_type = data.get('type', 'conversation')
            
            if not user_message:
                return jsonify({
                    'success': False,
                    'message': 'Tin nhắn không được để trống'
                }), 400
            
            # Sử dụng FlowService thay vì ChatService
            import asyncio
            
            # Tạo event loop nếu chưa có
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Chạy async method
            ai_response = loop.run_until_complete(
                flow_service.process_message_async(user_message, session_id)
            )
            
            # Lưu chat vào database
            try:
                chat = Chat(
                    user_message=user_message,
                    ai_response=ai_response,
                    session_id=session_id,
                    message_type=message_type,
                    created_at=datetime.utcnow()
                )
                db.session.add(chat)
                db.session.commit()
            except Exception as db_error:
                print(f"⚠️ Database save error: {str(db_error)}")
                db.session.rollback()
            
            return jsonify({
                'success': True,
                'ai_response': ai_response,
                'timestamp': datetime.utcnow().isoformat(),
                'session_id': session_id,
                'message_type': message_type
            })
            
        except Exception as e:
            print(f"❌ Chat error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/chat/history/<session_id>')
    @csrf.exempt  
    def get_chat_history(session_id):
        """Lấy lịch sử chat theo session_id"""
        try:
            limit = request.args.get('limit', 50, type=int)
            
            chat_service = ChatService()
            history = chat_service.get_chat_history(session_id, limit)
            
            return jsonify({
                'success': True,
                'history': history,
                'session_id': session_id
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/chat/search', methods=['POST'])
    @csrf.exempt
    def search_conversations():
        """Tìm kiếm các cuộc hội thoại tương tự"""
        try:
            data = request.get_json()
            query = data.get('query', '').strip()
            limit = data.get('limit', 5)
            
            if not query:
                return jsonify({
                    'success': False,
                    'message': 'Query không được để trống'
                }), 400
            
            chat_service = ChatService()
            results = chat_service.search_similar_conversations(query, limit)
            
            return jsonify({
                'success': True,
                'results': results,
                'query': query
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    # Note: Ideas endpoints have been simplified - keeping database but removing frontend routes
    # Ideas are still stored in database via chat service but no longer have dedicated management UI

    # Video Production page
    @app.route('/video-production')
    def video_production_page():
        """Video Production page route"""
        return render_template('video_production.html')

    # Video/Remotion routes
    @app.route('/api/video/compositions')
    @csrf.exempt
    def get_video_compositions():
        """Lấy danh sách video compositions"""
        try:
            video_service = get_video_service()
            compositions = video_service.get_compositions()
            
            return jsonify({
                'success': True,
                'compositions': compositions
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/video/audio-files')
    @csrf.exempt
    def get_audio_files():
        """Lấy danh sách audio files"""
        try:
            video_service = get_video_service()
            audio_files = video_service.get_available_audio_files()
            
            return jsonify({
                'success': True,
                'audio_files': audio_files
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/video/render', methods=['POST'])
    @csrf.exempt
    def render_video():
        """Render video sử dụng Remotion"""
        try:
            data = request.get_json()
            composition_id = data.get('composition_id')
            props = data.get('props', {})
            output_name = data.get('output_name')
            
            if not composition_id:
                return jsonify({
                    'success': False,
                    'message': 'Vui lòng cung cấp composition_id'
                }), 400
            
            video_service = get_video_service()
            job_id = video_service.render_video(composition_id, props, output_name)
            
            return jsonify({
                'success': True,
                'job_id': job_id,
                'message': 'Bắt đầu render video thành công'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/video/status/<job_id>')
    @csrf.exempt
    def get_render_status(job_id):
        """Lấy trạng thái render video"""
        try:
            video_service = get_video_service()
            status = video_service.get_render_status(job_id)
            
            if status is None:
                return jsonify({
                    'success': False,
                    'message': 'Không tìm thấy render job'
                }), 404
            
            # Convert datetime objects to strings for JSON serialization
            if 'start_time' in status:
                status['start_time'] = safe_datetime_to_string(status['start_time'])
            if 'end_time' in status:
                status['end_time'] = safe_datetime_to_string(status['end_time'])
            
            return jsonify({
                'success': True,
                'status': status
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/video/jobs')
    @csrf.exempt
    def get_all_render_jobs():
        """Lấy tất cả render jobs"""
        try:
            video_service = get_video_service()
            jobs = video_service.get_all_render_jobs()
            
            # Convert datetime objects to strings for JSON serialization
            for job_id, job_data in jobs.items():
                if 'start_time' in job_data:
                    job_data['start_time'] = safe_datetime_to_string(job_data['start_time'])
                if 'end_time' in job_data:
                    job_data['end_time'] = safe_datetime_to_string(job_data['end_time'])
            
            return jsonify({
                'success': True,
                'jobs': jobs
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    # Text-to-Speech routes
    @app.route('/api/tts/generate', methods=['POST'])
    @csrf.exempt
    def generate_tts():
        """Tạo speech từ text"""
        try:
            data = request.get_json()
            text = data.get('text', '').strip()
            filename = data.get('filename', '').strip()
            
            if not text:
                return jsonify({
                    'success': False,
                    'message': 'Vui lòng nhập text để chuyển đổi'
                }), 400
            
            if len(text) > 4000:  # OpenAI TTS limit
                return jsonify({
                    'success': False,
                    'message': 'Text quá dài (tối đa 4000 ký tự)'
                }), 400
            
            # Tạo job ID trước
            tts_service = get_tts_service()
            job_id = f"tts_{int(datetime.now().timestamp())}"
            
            # Chạy TTS trong thread riêng
            def run_tts():
                tts_service.generate_speech(text, filename, job_id)
            
            thread = threading.Thread(target=run_tts)
            thread.daemon = True
            thread.start()
            
            return jsonify({
                'success': True,
                'job_id': job_id,
                'message': 'Bắt đầu tạo speech thành công'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/tts/status/<job_id>')
    @csrf.exempt
    def get_tts_status(job_id):
        """Lấy trạng thái TTS job"""
        try:
            tts_service = get_tts_service()
            status = tts_service.get_tts_status(job_id)
            
            if status is None:
                return jsonify({
                    'success': False,
                    'message': 'Không tìm thấy TTS job'
                }), 404
            
            # Convert datetime objects to strings for JSON serialization
            if 'start_time' in status:
                status['start_time'] = safe_datetime_to_string(status['start_time'])
            if 'end_time' in status:
                status['end_time'] = safe_datetime_to_string(status['end_time'])
            
            return jsonify({
                'success': True,
                'status': status
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/tts/jobs')
    @csrf.exempt
    def get_all_tts_jobs():
        """Lấy tất cả TTS jobs"""
        try:
            tts_service = get_tts_service()
            jobs = tts_service.get_all_tts_jobs()
            
            # Convert datetime objects to strings for JSON serialization
            for job_id, job_data in jobs.items():
                if 'start_time' in job_data:
                    job_data['start_time'] = safe_datetime_to_string(job_data['start_time'])
                if 'end_time' in job_data:
                    job_data['end_time'] = safe_datetime_to_string(job_data['end_time'])
            
            return jsonify({
                'success': True,
                'jobs': jobs
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/tts/voices')
    @csrf.exempt
    def get_tts_voices():
        """Lấy danh sách voices có sẵn"""
        try:
            tts_service = get_tts_service()
            voices = tts_service.get_available_voices()
            
            return jsonify({
                'success': True,
                'voices': voices
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/video-progress/<job_id>')
    def video_progress_stream(job_id):
        """Server-Sent Events endpoint để stream video progress"""
        def generate_progress_events():
            import time
            import json
            from collections import defaultdict
            
            # Store để tracking video progress
            if not hasattr(app, 'video_progress_store'):
                app.video_progress_store = defaultdict(list)
            
            # Send initial connection confirmation
            yield f"data: {json.dumps({'type': 'connected', 'job_id': job_id})}\n\n"
            
            last_event_index = 0
            max_wait = 300  # 5 minutes timeout
            wait_count = 0
            
            while wait_count < max_wait:
                try:
                    # Check for new events for this job
                    events = app.video_progress_store.get(job_id, [])
                    
                    if len(events) > last_event_index:
                        # Send new events
                        for i in range(last_event_index, len(events)):
                            event_data = events[i]
                            yield f"data: {json.dumps(event_data)}\n\n"
                            
                            # If completed or failed, stop streaming
                            if event_data.get('step') in ['completed', 'failed']:
                                return
                        
                        last_event_index = len(events)
                    
                    time.sleep(1)  # Check every second
                    wait_count += 1
                    
                except Exception as e:
                    print(f"❌ [SSE] Error in progress stream: {str(e)}")
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                    break
            
            # Timeout
            yield f"data: {json.dumps({'type': 'timeout', 'job_id': job_id})}\n\n"
        
        response = Response(
            generate_progress_events(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            }
        )
        return response

    @app.route('/api/chat/create-video', methods=['POST'])
    @csrf.exempt
    def create_video_from_chat():
        """API để tạo video trực tiếp từ chat interface với realtime updates qua SSE"""
        try:
            data = request.get_json()
            topic = data.get('topic')
            duration = data.get('duration', 15)
            composition = data.get('composition', 'Scene-Landscape')
            background = data.get('background', 'office')
            voice = data.get('voice', 'nova')
            
            if not topic:
                return jsonify({
                    'success': False,
                    'message': 'Vui lòng cung cấp chủ đề video'
                }), 400
            
            # Tạo job ID cho việc tracking
            job_id = f"video_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
            
            print(f"🎬 [API] Starting video creation - Job ID: {job_id}")
            print(f"🎬 [API] Topic: {topic}")
            
            # Chạy video production trong thread riêng để không block response
            def run_video_production():
                try:
                    # Import và sử dụng enhanced VideoProductionFlow
                    from ..services.video_production_flow import create_video_from_topic_realtime
                    
                    result = create_video_from_topic_realtime(
                        topic=topic,
                        duration=duration,
                        composition=composition,
                        background=background,
                        voice=voice,
                        socketio=None,  # Không sử dụng SocketIO nữa
                        session_id="",  # Không cần session_id cho SSE
                        job_id=job_id
                    )
                    
                    print(f"🎬 [API] Video production completed for job: {job_id}")
                    
                except Exception as e:
                    print(f"❌ [API] Video production failed for job {job_id}: {str(e)}")
                    # Store error event
                    try:
                        from flask import current_app
                        from collections import defaultdict
                        
                        if not hasattr(current_app, 'video_progress_store'):
                            current_app.video_progress_store = defaultdict(list)
                        
                        error_event = {
                            'job_id': job_id,
                            'step': 'failed',
                            'message': f'Lỗi tạo video: {str(e)}',
                            'progress': 0,
                            'data': {'error': str(e)},
                            'timestamp': datetime.now().isoformat()
                        }
                        current_app.video_progress_store[job_id].append(error_event)
                    except Exception as store_error:
                        print(f"❌ [API] Failed to store error event: {str(store_error)}")
            
            # Chạy trong thread riêng
            thread = threading.Thread(target=run_video_production)
            thread.daemon = True
            thread.start()
            
            return jsonify({
                'success': True,
                'job_id': job_id,
                'message': 'Video creation initiated. Use SSE endpoint to track progress.'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    # Ideas management endpoints
    @app.route('/api/ideas')
    @csrf.exempt
    def get_ideas():
        """Lấy danh sách ideas"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            
            ideas = Idea.query.order_by(Idea.created_at.desc())\
                        .paginate(page=page, per_page=per_page, error_out=False)
            
            return jsonify({
                'success': True,
                'ideas': [idea.to_dict() for idea in ideas.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': ideas.total,
                    'pages': ideas.pages
                }
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi server: {str(e)}'
            }), 500

    # Add more routes here as needed