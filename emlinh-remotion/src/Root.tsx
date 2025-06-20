import { Composition, CalculateMetadataFunction } from "remotion"; // Thêm CalculateMetadataFunction
import { z } from "zod";
import { Scene } from "./Scene";

// Welcome to the Remotion Three Starter Kit!
// Two compositions have been created, showing how to use
// the `ThreeCanvas` component and the `useVideoTexture` hook.

// You can play around with the example or delete everything inside the canvas.

// Remotion Docs:
// https://remotion.dev/docs

// @remotion/three Docs:
// https://remotion.dev/docs/three

// React Three Fiber Docs:
// https://docs.pmnd.rs/react-three-fiber/getting-started/introduction

// Định nghĩa schema ở đây, bên ngoài component
export const myCompSchema = z.object({
  durationInSeconds: z.number().min(1).default(10),
  backgroundScene: z.enum(["office", "abstract", "none"]).default("none"),
  audioFileName: z.enum(["batnhatamkinh.wav", "None", "audio2.wav", "audio3.wav"]).default("None"), // Enum cho lựa chọn audio
  cameraFov: z.number().default(30),
  cameraPosition: z.tuple([z.number(), z.number(), z.number()]).default([0, 0.7, 4.5]),
});

// Lấy giá trị mặc định từ schema để tính durationInFrames
const defaultValues = myCompSchema.parse({}); // Parse với object rỗng để lấy defaults
const defaultDurationInSeconds = defaultValues.durationInSeconds;
const DURATION_IN_FRAMES_DEFAULT = defaultDurationInSeconds * 30; // Giả sử fps = 30 (khớp với fps của Composition)

// Hàm để tính toán metadata động
const calculateSceneMetadata: CalculateMetadataFunction<z.infer<typeof myCompSchema>> = ({ props }) => { // fps không có trong tham số này
  // props ở đây đã được parse và validate bởi myCompSchema (do schema được cung cấp cho Composition)
  // và cũng đã bao gồm defaultValues nếu input props không có durationInSeconds.
  const COMPOSITION_FPS = 30; // Giả định FPS giống như trong Composition
  const durationInFrames = Math.round(props.durationInSeconds * COMPOSITION_FPS);
  return {
    durationInFrames,
    props, // Trả về props đã được validate/resolve
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Composition cho tỷ lệ 16:9 (Landscape) */}
      <Composition
        id="Scene-Landscape"
        component={Scene}
        durationInFrames={DURATION_IN_FRAMES_DEFAULT}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema}
        defaultProps={{
          backgroundScene: 'none',
          durationInSeconds: defaultDurationInSeconds,
          audioFileName: "None", // Giá trị mặc định cho audio là "None"
          cameraFov: 30,
          cameraPosition: [0, 0.7, 4.5],
        }}
        calculateMetadata={calculateSceneMetadata}
      />
      {/* Composition cho tỷ lệ 9:16 (Portrait) */}
      <Composition
        id="Scene-Portrait"
        component={Scene}
        durationInFrames={DURATION_IN_FRAMES_DEFAULT}
        fps={30}
        width={1080}
        height={1920}
        schema={myCompSchema}
        defaultProps={{
          backgroundScene: 'none',
          durationInSeconds: defaultDurationInSeconds,
          audioFileName: "None", // Giá trị mặc định cho audio là "None"
          cameraFov: 30,
          cameraPosition: [0, 0.7, 4.5],
        }}
        calculateMetadata={calculateSceneMetadata}
      />
    </>
  );
};
