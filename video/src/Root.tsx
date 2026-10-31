import { Composition } from "remotion";
import { GoferVideo } from "./GoferVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Gofer"
      component={GoferVideo}
      durationInFrames={1230}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
