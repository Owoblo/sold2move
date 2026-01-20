import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';

const FAQPage = () => {
  const faqs = [
    {
      question: 'Where does your data come from?',
      answer: 'Our data is sourced in real-time from official county records and multiple listing services (MLS) across the United States and Canada. We ensure the data is accurate and up-to-date.',
    },
    {
      question: 'How "real-time" are the leads?',
      answer: 'Leads appear in your dashboard within hours of the official property sale record being filed. This gives you a significant head start over competitors relying on weekly or monthly data.',
    },
    {
      question: 'Can I target specific types of properties?',
      answer: 'Yes! You can filter leads by property type (e.g., single-family home, condo), sale price, square footage, and more to precisely target your ideal customer.',
    },
    {
      question: 'What is included in the direct mail service?',
      answer: 'Our direct mail service includes professionally designed templates, printing, postage, and delivery. You can customize the message, and we handle the rest.',
    },
    {
      question: 'Is there a contract or commitment?',
      answer: 'Our Starter and Growth plans are month-to-month, and you can cancel at any time. Enterprise plans may have custom contract terms.',
    },
    {
      question: 'Do you offer a free trial?',
      answer: 'Yes! We offer a 1 month free trial worth over $500 so you can experience the full power of Sold2Move. No credit card required to start.',
    },
    {
      question: 'What is your refund policy?',
      answer: 'We offer a 30-day money-back guarantee for all new subscriptions. If you are not satisfied, simply contact us within 30 days for a full refund.',
    },
    {
      question: 'How do I get support?',
      answer: 'Our dedicated support team is available via email, chat, and phone during business hours. Enterprise plans include a dedicated account manager.',
    },
  ];

  return (
    <PageWrapper
      title="FAQ"
      description="Find answers to common questions about Sold2Move, including data sources, lead quality, direct mail services, and pricing."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading"
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-slate mt-4 max-w-3xl mx-auto"
          >
            Have questions? We've got answers.
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <AccordionItem value={`item-${index}`}>
                  <AccordionTrigger className="text-lg text-left font-heading">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </PageWrapper>
  );
};

export default FAQPage;