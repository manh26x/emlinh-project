from flask import render_template, request, jsonify, session, send_file, abort, Response
from src.app.extensions import db, csrf
from src.services.flow_service import flow_service
from src.services.chat_service import get_chat_service
from src.app.models import Chat, Idea, Video
import threading
import uuid
import datetime
from datetime import datetime
import os
import mimetypes
from pathlib import Path

def safe_datetime_to_string(dt_obj):
    """Safely convert datetime object to string, return as-is if already string"""
    if dt_obj is None:
        return None
    if isinstance(dt_obj, datetime):
        return dt_obj.isoformat()
    return str(dt_obj)  # Return as string if not datetime

def register_routes(app):
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
            
            chat_service = get_chat_service()
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
            
            chat_service = get_chat_service()
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
        """
        Enhanced Server-Sent Events endpoint với auto-reconnection support
        """
        def generate_progress_events():
            import time
            import json
            from collections import defaultdict
            
            # Initialize progress store nếu chưa có
            if not hasattr(app, 'video_progress_store'):
                app.video_progress_store = defaultdict(list)
            
            # Send initial connection confirmation
            yield f"data: {json.dumps({'type': 'connected', 'job_id': job_id, 'timestamp': datetime.now().isoformat()})}\n\n"
            
            last_event_index = 0
            max_wait = 600  # 10 minutes timeout (increased from 5)
            wait_count = 0
            heartbeat_interval = 30  # Send heartbeat every 30 seconds
            last_heartbeat = 0
            
            print(f"📡 [SSE] Starting stream for job {job_id}")
            
            while wait_count < max_wait:
                try:
                    current_time = time.time()
                    
                    # Send heartbeat để keep connection alive
                    if current_time - last_heartbeat > heartbeat_interval:
                        heartbeat_data = {
                            'type': 'heartbeat',
                            'job_id': job_id,
                            'timestamp': datetime.now().isoformat(),
                            'alive': True
                        }
                        yield f"data: {json.dumps(heartbeat_data)}\n\n"
                        last_heartbeat = current_time
                        print(f"💓 [SSE] Heartbeat sent for job {job_id}")
                    
                    # Check for new events cho job này
                    events = app.video_progress_store.get(job_id, [])
                    
                    if len(events) > last_event_index:
                        print(f"📡 [SSE] Found {len(events) - last_event_index} new events for job {job_id}")
                        
                        # Send tất cả events mới
                        for i in range(last_event_index, len(events)):
                            event_data = events[i]
                            print(f"📡 [SSE] Sending event: {event_data.get('step', 'unknown')}")
                            yield f"data: {json.dumps(event_data)}\n\n"
                            
                            # Nếu completed hoặc failed, gửi final event và stop
                            if event_data.get('step') in ['completed', 'failed']:
                                print(f"📡 [SSE] Job {job_id} finished with step: {event_data.get('step')}")
                                
                                # Send final goodbye message
                                final_message = {
                                    'type': 'stream_end',
                                    'job_id': job_id,
                                    'final_step': event_data.get('step'),
                                    'timestamp': datetime.now().isoformat()
                                }
                                yield f"data: {json.dumps(final_message)}\n\n"
                                
                                # Cleanup - xóa events sau khi hoàn thành để tiết kiệm memory
                                try:
                                    if job_id in app.video_progress_store:
                                        del app.video_progress_store[job_id]
                                        print(f"🧹 [SSE] Cleaned up events for completed job {job_id}")
                                except Exception as cleanup_error:
                                    print(f"⚠️ [SSE] Cleanup error: {cleanup_error}")
                                
                                return
                        
                        last_event_index = len(events)
                    
                    # Short sleep to avoid busy waiting
                    time.sleep(0.5)  # Check twice per second for responsiveness
                    wait_count += 0.5
                    
                except GeneratorExit:
                    print(f"🔌 [SSE] Client disconnected from job {job_id}")
                    break
                except Exception as e:
                    print(f"❌ [SSE] Error in progress stream for job {job_id}: {str(e)}")
                    error_data = {
                        'type': 'error',
                        'job_id': job_id,
                        'message': str(e),
                        'timestamp': datetime.now().isoformat()
                    }
                    yield f"data: {json.dumps(error_data)}\n\n"
                    break
            
            # Timeout reached
            print(f"⏰ [SSE] Timeout reached for job {job_id}")
            timeout_data = {
                'type': 'timeout',
                'job_id': job_id,
                'message': f'Không nhận được cập nhật trong {max_wait//60} phút',
                'timestamp': datetime.now().isoformat()
            }
            yield f"data: {json.dumps(timeout_data)}\n\n"
        
        # Enhanced response headers for better SSE support
        response = Response(
            generate_progress_events(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Expose-Headers': 'Last-Event-ID',
                'X-Accel-Buffering': 'no'  # Disable nginx buffering
            }
        )
        return response

    @app.route('/api/video-progress/<job_id>/status')
    def video_job_status(job_id):
        """
        Kiểm tra trạng thái của video job mà không cần SSE stream
        """
        try:
            # Initialize progress store nếu chưa có
            if not hasattr(app, 'video_progress_store'):
                from collections import defaultdict
                app.video_progress_store = defaultdict(list)
            
            events = app.video_progress_store.get(job_id, [])
            
            if not events:
                return jsonify({
                    'success': False,
                    'job_id': job_id,
                    'status': 'not_found',
                    'message': 'Job không tồn tại hoặc chưa bắt đầu'
                }), 404
            
            # Lấy event cuối cùng để xác định trạng thái
            latest_event = events[-1] if events else None
            
            status_info = {
                'success': True,
                'job_id': job_id,
                'status': latest_event.get('step', 'unknown') if latest_event else 'unknown',
                'progress': latest_event.get('progress', 0) if latest_event else 0,
                'message': latest_event.get('message', '') if latest_event else '',
                'total_events': len(events),
                'last_update': latest_event.get('timestamp', '') if latest_event else '',
                'is_completed': latest_event.get('step') in ['completed', 'failed'] if latest_event else False
            }
            
            # Thêm thông tin video nếu completed
            if latest_event and latest_event.get('step') == 'completed':
                event_data = latest_event.get('data', {})
                if event_data.get('video_id'):
                    status_info['video_id'] = event_data['video_id']
                    status_info['video_url'] = f"/api/videos/{event_data['video_id']}/file"
            
            return jsonify(status_info)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'job_id': job_id,
                'status': 'error',
                'message': f'Lỗi server: {str(e)}'
            }), 500

    @app.route('/api/video-progress/cleanup', methods=['POST'])
    @csrf.exempt
    def cleanup_old_progress():
        """
        Cleanup old progress events để tiết kiệm memory
        """
        try:
            if not hasattr(app, 'video_progress_store'):
                return jsonify({
                    'success': True,
                    'message': 'Không có progress store nào để cleanup',
                    'cleaned_jobs': 0
                })
            
            # Tìm và xóa các jobs đã completed/failed cũ hơn 1 giờ
            from datetime import datetime, timedelta
            import json
            
            now = datetime.now()
            cutoff_time = now - timedelta(hours=1)
            jobs_to_remove = []
            
            for job_id, events in app.video_progress_store.items():
                if events:
                    latest_event = events[-1]
                    if latest_event.get('step') in ['completed', 'failed']:
                        try:
                            event_time = datetime.fromisoformat(latest_event.get('timestamp', ''))
                            if event_time < cutoff_time:
                                jobs_to_remove.append(job_id)
                        except:
                            # Nếu không parse được timestamp, coi như cũ
                            jobs_to_remove.append(job_id)
            
            # Xóa các jobs cũ
            for job_id in jobs_to_remove:
                del app.video_progress_store[job_id]
            
            return jsonify({
                'success': True,
                'message': f'Đã cleanup {len(jobs_to_remove)} jobs cũ',
                'cleaned_jobs': len(jobs_to_remove),
                'remaining_jobs': len(app.video_progress_store)
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Lỗi cleanup: {str(e)}'
            }), 500

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
                        job_id=job_id,
                        app_instance=app  # Truyền app instance từ route context
                    )
                    
                    print(f"🎬 [API] Video production completed for job: {job_id}")
                    
                except Exception as e:
                    print(f"❌ [API] Video production failed for job {job_id}: {str(e)}")
                    # Store error event using app instance
                    try:
                        from collections import defaultdict
                        
                        if not hasattr(app, 'video_progress_store'):
                            app.video_progress_store = defaultdict(list)
                        
                        error_event = {
                            'job_id': job_id,
                            'step': 'failed',
                            'message': f'Lỗi tạo video: {str(e)}',
                            'progress': 0,
                            'data': {'error': str(e)},
                            'timestamp': datetime.now().isoformat()
                        }
                        app.video_progress_store[job_id].append(error_event)
                        print(f"✅ [API] Error event stored for job: {job_id}")
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