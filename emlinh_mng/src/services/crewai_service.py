from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool
import os

from .video_production_tool import VideoProductionTool

class CrewAIService:
    """Service class để quản lý CrewAI agents và tasks"""
    
    def __init__(self):
        # Cấu hình API key (bạn cần set environment variable)
        # os.environ["OPENAI_API_KEY"] = "your-openai-api-key"
        pass
    
    def create_emlinh_agent(self):
        """Tạo agent Em Linh AI với personality tự nhiên, thân thiện và có khả năng tạo video"""
        return Agent(
            role='Em Linh AI - Trợ lý sáng tạo và video producer',
            goal='Trò chuyện tự nhiên, hỗ trợ ý tưởng, lập kế hoạch, và tạo video khi được yêu cầu. Luôn hỏi ý kiến người dùng trước khi thực hiện hành động quan trọng',
            backstory="""Bạn là Em Linh AI, một người trợ lý sáng tạo, thân thiện và có khả năng tạo video AI avatar. 
            
            QUAN TRỌNG: Khi người dùng nói về "tạo video", "làm video", "quay video", "video về", hoặc yêu cầu tương tự, 
            bạn PHẢI sử dụng Video Production Tool ngay lập tức để tạo video thực sự.
            
            Bạn có thể:
            - Trò chuyện tự nhiên và hỗ trợ ý tưởng
            - Tạo video thực sự với avatar 3D bằng Video Production Tool
            - Luôn hỏi lại người dùng khi có ý tưởng mới
            
            Khi người dùng yêu cầu video:
            1. Xác định chủ đề từ câu nói của họ
            2. Sử dụng Video Production Tool với thông số mặc định (duration=15, composition="Scene-Landscape", background="office", voice="nova")
            3. Báo cáo kết quả cho người dùng
            
            Bạn luôn giao tiếp gần gũi, tự nhiên, không máy móc.""",
            verbose=True,
            allow_delegation=False,
            tools=[VideoProductionTool()]
        )
    
    def create_emlinh_task(self, user_message, context=None):
        """Tạo task trò chuyện với Em Linh AI"""
        description = f"""
        Trò chuyện với người dùng như một người bạn đồng hành. 
        
        QUAN TRỌNG: Nếu người dùng yêu cầu tạo video (ví dụ: "tạo video về...", "làm video...", "video về..."), 
        bạn PHẢI sử dụng Video Production Tool để tạo video thực sự ngay lập tức.
        
        Tin nhắn người dùng: {user_message}
        {f'Ngữ cảnh: {context}' if context else ''}
        """
        return Task(
            description=description,
            agent=self.create_emlinh_agent(),
            expected_output="Phản hồi tự nhiên, thân thiện. Nếu được yêu cầu tạo video thì sử dụng Video Production Tool."
        )
    
    def run_emlinh_conversation(self, user_message, context=None):
        """Chạy crew trò chuyện Em Linh AI"""
        try:
            emlinh_task = self.create_emlinh_task(user_message, context)
            crew = Crew(
                agents=[emlinh_task.agent],
                tasks=[emlinh_task],
                process=Process.sequential,
                verbose=True
            )
            result = crew.kickoff()
            return {
                'success': True,
                'result': result,
                'message': 'Trò chuyện với Em Linh AI thành công!'
            }
        except Exception as e:
            return {
                'success': False,
                'result': None,
                'message': f'Lỗi khi trò chuyện: {str(e)}'
            }
    
    def create_research_agent(self):
        """Tạo agent nghiên cứu"""
        return Agent(
            role='Research Analyst',
            goal='Nghiên cứu và phân tích thông tin chi tiết về chủ đề được yêu cầu',
            backstory="""Bạn là một nhà phân tích nghiên cứu giàu kinh nghiệm với khả năng 
                        tìm kiếm, phân tích và tổng hợp thông tin từ nhiều nguồn khác nhau.""",
            verbose=True,
            allow_delegation=False
        )
    
    def create_writer_agent(self):
        """Tạo agent viết nội dung"""
        return Agent(
            role='Content Writer',
            goal='Tạo ra nội dung chất lượng cao dựa trên nghiên cứu được cung cấp',
            backstory="""Bạn là một nhà văn chuyên nghiệp với khả năng viết nội dung 
                        hấp dẫn, rõ ràng và có cấu trúc tốt.""",
            verbose=True,
            allow_delegation=False
        )
    
    def create_research_task(self, agent, topic):
        """Tạo task nghiên cứu"""
        return Task(
            description=f"""
            Nghiên cứu chi tiết về chủ đề: {topic}
            
            Hãy tìm hiểu:
            - Thông tin cơ bản và định nghĩa
            - Xu hướng hiện tại
            - Những điểm quan trọng và thú vị
            - Ứng dụng thực tế
            
            Kết quả cần chi tiết và có cấu trúc rõ ràng.
            """,
            agent=agent,
            expected_output="Báo cáo nghiên cứu chi tiết với các thông tin được tổ chức có hệ thống"
        )
    
    def create_writing_task(self, agent, research_result):
        """Tạo task viết nội dung"""
        return Task(
            description=f"""
            Dựa trên kết quả nghiên cứu sau, hãy viết một bài viết hay và súc tích:
            
            {research_result}
            
            Bài viết cần:
            - Có tiêu đề hấp dẫn
            - Cấu trúc rõ ràng với đầu, thân, kết
            - Dễ hiểu và thú vị
            - Độ dài khoảng 500-800 từ
            """,
            agent=agent,
            expected_output="Bài viết hoàn chỉnh với tiêu đề và nội dung được cấu trúc tốt"
        )
    
    def run_content_creation_crew(self, topic):
        """Chạy crew để tạo nội dung về một chủ đề"""
        try:
            # Tạo agents
            researcher = self.create_research_agent()
            writer = self.create_writer_agent()
            
            # Tạo tasks
            research_task = self.create_research_task(researcher, topic)
            writing_task = self.create_writing_task(writer, "")
            
            # Thiết lập dependency: writing_task phụ thuộc vào research_task
            writing_task.context = [research_task]
            
            # Tạo crew
            crew = Crew(
                agents=[researcher, writer],
                tasks=[research_task, writing_task],
                process=Process.sequential,
                verbose=True
            )
            
            # Chạy crew
            result = crew.kickoff()
            return {
                'success': True,
                'result': result,
                'message': 'Nội dung đã được tạo thành công!'
            }
            
        except Exception as e:
            return {
                'success': False,
                'result': None,
                'message': f'Lỗi khi tạo nội dung: {str(e)}'
            }
    
    def simple_analysis_crew(self, data, analysis_type="general"):
        """Crew đơn giản để phân tích dữ liệu"""
        try:
            analyst = Agent(
                role='Data Analyst',
                goal=f'Phân tích {analysis_type} dữ liệu được cung cấp',
                backstory='Bạn là chuyên gia phân tích dữ liệu với nhiều năm kinh nghiệm.',
                verbose=True
            )
            
            analysis_task = Task(
                description=f"""
                Phân tích dữ liệu sau đây theo hướng {analysis_type}:
                
                {data}
                
                Hãy cung cấp:
                - Tóm tắt các điểm chính
                - Nhận xét và đánh giá
                - Khuyến nghị (nếu có)
                """,
                agent=analyst,
                expected_output="Báo cáo phân tích với các insights và khuyến nghị cụ thể"
            )
            
            crew = Crew(
                agents=[analyst],
                tasks=[analysis_task],
                process=Process.sequential,
                verbose=True
            )
            
            result = crew.kickoff()
            return {
                'success': True,
                'result': result,
                'message': 'Phân tích đã hoàn thành!'
            }
            
        except Exception as e:
            return {
                'success': False,
                'result': None,
                'message': f'Lỗi khi phân tích: {str(e)}'
            }

# Tạo instance global để sử dụng trong Flask app
crewai_service = CrewAIService()