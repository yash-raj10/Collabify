import React from "react";

const DocPage: React.FC = () => {
  return (
    <div className="bg-gray-100 min-h-screen p-16 flex justify-center">
      <div
        className="bg-white h-[1124px] w-[784px] p-8 shadow-md relative"
        contentEditable
      ></div>
    </div>
  );
};

export default DocPage;
