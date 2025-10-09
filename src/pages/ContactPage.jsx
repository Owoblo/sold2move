import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema } from '@/lib/validationSchemas';
import PageWrapper from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';
import LoadingButton from '@/components/ui/LoadingButton';

const ContactPage = () => {
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      message: '',
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = (values) => {
    console.log('Form Data:', values);

    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        toast({
          title: '✅ Message Sent!',
          description: "Thanks for reaching out. We'll get back to you shortly.",
          className: 'bg-teal text-deep-navy',
        });
        form.reset();
        resolve();
      }, 1500);
    });
  };

  return (
    <PageWrapper
      title="Contact Us"
      description="Request a demo or get in touch with the Sold2Move team. We're here to answer your questions and help you get started."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading">Get in Touch</h1>
          <p className="text-lg text-slate mt-4 max-w-3xl mx-auto">
            Ready to see Sold2Move in action? Fill out the form to request a personalized demo.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3 bg-light-navy p-8 rounded-lg"
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-light-slate">Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-light-slate">Company Name</FormLabel>
                        <FormControl><Input placeholder="MoveIt Inc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-light-slate">Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="john@moveit.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-light-slate">Phone Number</FormLabel>
                        <FormControl><Input type="tel" placeholder="(555) 123-4567" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-light-slate">City</FormLabel>
                        <FormControl><Input placeholder="New York" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-light-slate">State / Province</FormLabel>
                        <FormControl><Input placeholder="NY" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-light-slate">Message</FormLabel>
                      <FormControl><Textarea placeholder="Tell us about your business and what you're looking for..." rows={4} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <LoadingButton type="submit" size="lg" className="w-full bg-teal text-deep-navy hover:bg-teal/90" isLoading={isSubmitting}>
                  Request a Demo
                </LoadingButton>
              </form>
            </Form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="flex items-start">
              <Mail className="h-6 w-6 text-teal mt-1 mr-4" />
              <div>
                <h3 className="text-xl font-semibold text-lightest-slate font-heading">Email</h3>
                <p className="text-slate">General Inquiries</p>
                <a href="mailto:hello@sold2move.com" className="text-teal hover:underline">hello@sold2move.com</a>
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="h-6 w-6 text-teal mt-1 mr-4" />
              <div>
                <h3 className="text-xl font-semibold text-lightest-slate font-heading">Phone</h3>
                <p className="text-slate">Sales & Support</p>
                <a href="tel:1-800-555-0199" className="text-teal hover:underline">1-800-555-0199</a>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="h-6 w-6 text-teal mt-1 mr-4" />
              <div>
                <h3 className="text-xl font-semibold text-lightest-slate font-heading">Office</h3>
                <p className="text-slate">123 Innovation Drive<br />Suite 404<br />Austin, TX 78701</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default ContactPage;