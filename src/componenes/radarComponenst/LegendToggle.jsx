// eslint-disable-next-line no-unused-vars
import React from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';

// eslint-disable-next-line react/prop-types
const LegendToggle = ({ showLegend, setShowLegend }) => {
  return (
    <div className="absolute top-52 md:right-20 right-10 z-20">
      <button 
        className="bg-white text-slate-700 px-4 py-2 rounded-lg shadow-md backdrop-blur-sm hover:bg-purple-200 active:scale-95" 
        onClick={() => setShowLegend(!showLegend)}
      >
        {showLegend ? <FaRegEye /> : <FaRegEyeSlash />}
      </button>
    </div>
  );
};

export default LegendToggle;
