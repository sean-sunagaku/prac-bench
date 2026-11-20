import {Composition, Still} from "remotion";
import {Film} from "./Film";
import {Cover} from "./Cover";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="TheSeaFallsUp" component={Film} durationInFrames={2688} fps={24} width={1920} height={1080} />
      <Still id="RecordSleeve" component={Cover} width={1200} height={1200} />
    </>
  );
};
