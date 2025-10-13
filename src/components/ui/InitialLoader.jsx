import React from 'react';

const InitialLoader = () => {
  return (
    <div className="loading">
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-600 font-medium">Loading Sold2Move...</div>
      </div>
    </div>
  );
};

export default InitialLoader;
