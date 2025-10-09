import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useSession } from '@supabase/auth-helpers-react';

const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const session = useSession();

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Message',
        description: 'Please type a message before sending.',
      });
      return;
    }

    setIsSending(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: session?.user?.id,
      user_email: session?.user?.email,
      message: message.trim(),
    });
    setIsSending(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error Sending Feedback',
        description: error.message,
      });
    } else {
      toast({
        title: '✅ Feedback Sent!',
        description: "Thanks for your message. We'll get back to you soon.",
      });
      setMessage('');
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            onClick={toggleOpen}
            className="rounded-full w-16 h-16 bg-teal text-deep-navy shadow-lg hover:bg-teal/90"
          >
            {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-light-navy rounded-lg border border-lightest-navy/20 shadow-2xl"
          >
            <div className="p-4 border-b border-lightest-navy/20">
              <h3 className="font-bold text-lightest-slate">Feedback & Support</h3>
              <p className="text-sm text-slate">Have a question or feedback? Let us know!</p>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label htmlFor="feedback-message" className="sr-only">
                  Your message
                </Label>
                <Textarea
                  id="feedback-message"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-32"
                  disabled={isSending}
                />
              </div>
              <Button type="submit" className="w-full bg-teal text-deep-navy hover:bg-teal/90" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatWidget;