import GeneratorCard from "./GeneratorCard";
import { generatorsMeta } from "./generatorsMeta";

export default function GeneratorsList() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {generatorsMeta.map((generator) => (
          <GeneratorCard key={generator.kind} item={generator} />
        ))}
      </div>
    </div>
  );
}
