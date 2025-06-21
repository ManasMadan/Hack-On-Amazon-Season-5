
import React from 'react';
import { Shield, Mic, Zap, Users, CreditCard, CheckCircle, ArrowRight, Lock, Globe, Headphones } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <Mic className="w-8 h-8" />,
      title: "Voice Biometric Authentication",
      description: "Advanced AI-powered voice recognition technology ensures secure, personalized authentication for every transaction.",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Smart Payment Routing",
      description: "Intelligent routing system optimizes transaction paths for maximum efficiency and minimal fees across global networks.",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Fraud-Safe Dispute Resolution",
      description: "Automated dispute resolution powered by machine learning algorithms to protect both merchants and customers.",
      gradient: "from-green-500 to-blue-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Seamless User Experience",
      description: "Intuitive interface designed for both tech-savvy users and everyday consumers with zero learning curve.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Enterprise-Grade Security",
      description: "Bank-level encryption and multi-layer security protocols ensure your financial data remains protected.",
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Payment Network",
      description: "Connect with payment systems worldwide for seamless international transactions and currency conversions.",
      gradient: "from-teal-500 to-green-600"
    }
  ];

  return (
    <div id="features" className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Our Features &{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Services
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-accent-foreground/60 dark:text-secondary/50 max-w-3xl mx-auto">
            Discover the cutting-edge features that make SecureVoice+ the future of digital payments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                {feature.title}
              </h3>
              
              <p className="text-gray-300 leading-relaxed mb-6">
                {feature.description}
              </p>
              
              <div className="flex items-center text-blue-400 font-medium group-hover:text-purple-400 transition-colors duration-300">
                Learn More
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;