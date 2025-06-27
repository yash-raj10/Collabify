import Image from "next/image";
import DocPage from "./DocPage";
import ExcaliDrawComp from "./ExcaliDrawComp";

export default function Home() {
  return (
    <div className="text-black text-2xl">
      {/* <DocPage /> */}
      <ExcaliDrawComp />;
    </div>
  );
}
