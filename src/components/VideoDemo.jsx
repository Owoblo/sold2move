import React from 'react';
import { motion } from 'framer-motion';
import { Play, ExternalLink } from 'lucide-react';

const VideoDemo = ({ 
  loomUrl = "https://www.loom.com/share/a72216f30d6b40e1af6ca1b7908d7604?sid=4dd47ae7-0344-47b4-a3fc-fe3a7dae8191",
  title = "See Sold2Move in Action",
  description = "Watch how our platform delivers real-time sold listings and leads for moving companies",
  className = ""
}) => {
  // Extract video ID from Loom URL
  const getVideoId = (url) => {
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(loomUrl);
  const embedUrl = videoId ? `https://www.loom.com/embed/${videoId}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 1 }}
      className={`relative ${className}`}
    >
      <div className="relative mx-auto max-w-4xl">
        <div className="absolute inset-0 bg-gradient-to-r from-teal/20 to-navy-accent/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-teal/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-sm sm:text-base text-slate">{description}</p>
          </div>
          
          {embedUrl ? (
            <div className="relative w-full h-56 sm:h-64 lg:h-96 bg-gradient-to-br from-deep-navy to-light-navy rounded-2xl shadow-2xl overflow-hidden">
              <iframe
                src={embedUrl}
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
                title="Sold2Move Platform Demo"
              />
            </div>
          ) : (
            <div className="w-full h-56 sm:h-64 lg:h-96 bg-gradient-to-br from-deep-navy to-light-navy rounded-2xl shadow-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Play className="h-16 w-16 text-teal" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Demo Video</h3>
                <p className="text-slate mb-4">Watch our platform in action</p>
                <a
                  href={loomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-teal text-white rounded-full font-semibold hover:bg-teal/90 transition-colors"
                >
                  Watch on Loom
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          
          <div className="absolute -top-4 -right-4 bg-gradient-to-r from-navy-accent to-teal rounded-full p-3 shadow-lg">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoDemo;
