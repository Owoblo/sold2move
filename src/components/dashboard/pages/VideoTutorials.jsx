import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const VideoTutorials = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Video Tutorials & FAQ</h1>
      <Card>
        <CardHeader>
          <CardTitle>Learn the Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Watch video tutorials and find answers to frequently asked questions.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoTutorials;