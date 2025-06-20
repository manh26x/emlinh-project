import os
import subprocess
import json
import threading
import time
from datetime import datetime
from typing import Dict, Any, Optional, List


class VideoService:
    def __init__(self):
        # Đường dẫn tới dự án Remotion (từ workspace root)
        workspace_root = '/home/mike/Documents/Code/emlinh_projects'
        self.remotion_path = os.path.join(workspace_root, 'emlinh-remotion')
        self.output_dir = workspace_root
        
        # Lưu trữ trạng thái render jobs
        self.render_jobs = {}
        
    def get_compositions(self) -> List[Dict[str, Any]]:
        """Lấy danh sách các composition có sẵn từ Remotion"""
        try:
            # Chạy lệnh để lấy thông tin compositions
            result = subprocess.run(
                ['npx', 'remotion', 'compositions'],
                cwd=self.remotion_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                # Parse output để lấy thông tin compositions
                compositions = []
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if line.strip() and not line.startswith('Found'):
                        # Giả định format output của remotion compositions
                        parts = line.strip().split()
                        if len(parts) >= 1:
                            compositions.append({
                                'id': parts[0],
                                'description': ' '.join(parts[1:]) if len(parts) > 1 else ''
                            })
                
                # Fallback với compositions mặc định nếu không parse được
                if not compositions:
                    compositions = [
                        {'id': 'Scene-Landscape', 'description': 'Landscape format (16:9)'},
                        {'id': 'Scene-Portrait', 'description': 'Portrait format (9:16)'}
                    ]
                    
                return compositions
            else:
                # Trả về compositions mặc định nếu lỗi
                return [
                    {'id': 'Scene-Landscape', 'description': 'Landscape format (16:9)'},
                    {'id': 'Scene-Portrait', 'description': 'Portrait format (9:16)'}
                ]
                
        except Exception as e:
            print(f"Error getting compositions: {e}")
            return [
                {'id': 'Scene-Landscape', 'description': 'Landscape format (16:9)'},
                {'id': 'Scene-Portrait', 'description': 'Portrait format (9:16)'}
            ]
    
    def render_video(self, composition_id: str, props: Dict[str, Any], output_name: Optional[str] = None) -> str:
        """Bắt đầu render video với composition và props chỉ định"""
        
        # Tạo job ID unique
        job_id = f"render_{int(time.time())}_{composition_id}"
        
        # Tạo tên file output
        if not output_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_name = f"video_{composition_id}_{timestamp}.mp4"
        
        output_path = os.path.join(self.output_dir, output_name)
        
        # Khởi tạo job status
        self.render_jobs[job_id] = {
            'status': 'starting',
            'progress': 0,
            'output_path': output_path,
            'composition_id': composition_id,
            'props': props,
            'start_time': datetime.now(),
            'error': None
        }
        
        # Chạy render trong thread riêng
        thread = threading.Thread(target=self._render_thread, args=(job_id, composition_id, props, output_path))
        thread.daemon = True
        thread.start()
        
        return job_id
    
    def _render_thread(self, job_id: str, composition_id: str, props: Dict[str, Any], output_path: str):
        """Thread function để render video"""
        try:
            self.render_jobs[job_id]['status'] = 'rendering'
            
            # Chuẩn bị input props
            input_props = json.dumps(props)
            
            # Lệnh render
            cmd = [
                'npx', 'remotion', 'render',
                composition_id,
                output_path,
                '--props', input_props,
                '--concurrency', '1'
            ]
            
            # Chạy lệnh render
            process = subprocess.Popen(
                cmd,
                cwd=self.remotion_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Theo dõi progress (đơn giản)
            while process.poll() is None:
                self.render_jobs[job_id]['progress'] = min(self.render_jobs[job_id]['progress'] + 5, 90)
                time.sleep(2)
            
            # Kiểm tra kết quả
            if process.returncode == 0:
                self.render_jobs[job_id]['status'] = 'completed'
                self.render_jobs[job_id]['progress'] = 100
                self.render_jobs[job_id]['end_time'] = datetime.now()
            else:
                stdout, stderr = process.communicate()
                self.render_jobs[job_id]['status'] = 'failed'
                self.render_jobs[job_id]['error'] = stderr or stdout
                
        except Exception as e:
            self.render_jobs[job_id]['status'] = 'failed'
            self.render_jobs[job_id]['error'] = str(e)
    
    def get_render_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Lấy trạng thái render job"""
        return self.render_jobs.get(job_id)
    
    def get_all_render_jobs(self) -> Dict[str, Dict[str, Any]]:
        """Lấy tất cả render jobs"""
        return self.render_jobs
    
    def get_available_audio_files(self) -> List[str]:
        """Lấy danh sách file audio có sẵn"""
        audio_dir = os.path.join(self.remotion_path, 'public', 'audios')
        try:
            if os.path.exists(audio_dir):
                files = [f for f in os.listdir(audio_dir) if f.endswith(('.wav', '.mp3', '.m4a'))]
                return ['None'] + files
            else:
                return ['None', 'batnhatamkinh.wav']
        except Exception:
            return ['None', 'batnhatamkinh.wav']


# Singleton instance
video_service = VideoService()


def get_video_service() -> VideoService:
    """Lấy instance của VideoService"""
    return video_service 