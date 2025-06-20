/**
 * Tiện ích tải và xử lý mouth cue từ JSON
 */
import { MouthCue } from '../types';

/**
 * Tải và xử lý mouth cue từ URL
 */
export const loadMouthCues = async (mouthCuesUrl: string): Promise<MouthCue[] | null> => {
  if (!mouthCuesUrl) {
    console.warn("mouthCueLoader: URL của file mouth cues không được cung cấp!");
    return null;
  }
  
  console.log("mouthCueLoader: Bắt đầu tải mouth cues từ URL:", mouthCuesUrl);

  try {
    // Kiểm tra URL hợp lệ
    if (!mouthCuesUrl.startsWith('http') && !mouthCuesUrl.startsWith('/')) {
      console.error("mouthCueLoader: URL không hợp lệ!", mouthCuesUrl);
      return null;
    }

    console.log("mouthCueLoader: Đang fetch dữ liệu từ URL...");
    const response = await fetch(mouthCuesUrl);
    console.log("mouthCueLoader: Kết quả fetch:", {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: [...response.headers.entries()].reduce((obj, [key, value]) => ({...obj, [key]: value}), {})
    });

    if (!response.ok) {
      console.error(`Lỗi ${response.status} khi tải file từ ${mouthCuesUrl}`);
      throw new Error(`Lỗi khi tải file mouth cues: ${response.statusText}`);
    }
    
    // Đọc nội dung response dưới dạng text trước
    const textData = await response.text();
    console.log("mouthCueLoader: Đã nhận dữ liệu text, độ dài:", textData.length);
    console.log("mouthCueLoader: Mẫu dữ liệu text:", textData.substring(0, 100), "...");
    
    // Parse JSON
    try {
      const data = JSON.parse(textData);
      console.log("mouthCueLoader: Parse JSON thành công!");
      
      // Kiểm tra cấu trúc dữ liệu
      if (Array.isArray(data)) {
        // Nếu dữ liệu là mảng trực tiếp
        console.log("mouthCueLoader: Dữ liệu là mảng trực tiếp");
        return processMouthCueData(data);
      } else if (typeof data === 'object' && data !== null) {
        // Kiểm tra xem có trường mouthCues không
        if (Array.isArray(data.mouthCues)) {
          console.log("mouthCueLoader: Tìm thấy mảng trong trường mouthCues!", data.mouthCues.length, "mục");
          return processMouthCueData(data.mouthCues);
        } else {
          console.error("mouthCueLoader: Dữ liệu không chứa mảng mouthCues!", data);
          console.log("mouthCueLoader: Các trường có trong dữ liệu:", Object.keys(data));
          return null;
        }
      } else {
        console.error("mouthCueLoader: Dữ liệu không phải mảng hoặc object!", typeof data);
        return null;
      }
    } catch (parseError) {
      console.error("mouthCueLoader: Lỗi khi parse JSON:", parseError);
      console.log("mouthCueLoader: Nội dung JSON gây lỗi:", textData.substring(0, 200), "...");
      return null;
    }
  } catch (error) {
    console.error("mouthCueLoader: Lỗi khi tải file mouth cues:", error);
    return null;
  }
};

/**
 * Xử lý dữ liệu mouth cue để đảm bảo đúng định dạng
 */
const processMouthCueData = (data: any[]): MouthCue[] => {
  if (!data || data.length === 0) {
    console.warn("processMouthCueData: Dữ liệu mouth cues rỗng!");
    return [];
  }
  
  // Kiểm tra cấu trúc dữ liệu
  const firstItem = data[0];
  console.log("processMouthCueData: Kiểm tra cấu trúc MouthCue:", {
    hasStart: 'start' in firstItem,
    hasEnd: 'end' in firstItem,
    hasValue: 'value' in firstItem,
    hasViseme: 'viseme' in firstItem,
    keys: Object.keys(firstItem)
  });
  console.log("processMouthCueData: Mẫu dữ liệu:", JSON.stringify(data.slice(0, 2)));
  
  // Đổi tên trường hợp cấu trúc không chuẩn
  if ('viseme' in firstItem && !('value' in firstItem)) {
    console.log("processMouthCueData: Đổi tên trường 'viseme' thành 'value'");
    return data.map(item => ({
      start: item.start,
      end: item.end,
      value: item.viseme
    }));
  }
  
  return data as MouthCue[];
};
