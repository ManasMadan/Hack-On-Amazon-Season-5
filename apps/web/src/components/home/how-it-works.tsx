import { Mic, Shield, CreditCard, CheckCircle, Zap, Headphones } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      step: "1",
      title: "Voice Registration",
      description: "Register your unique voice biometric signature through our secure AI-powered system. Your voice becomes your digital fingerprint.",
      icon: <Mic className="w-12 h-12" />,
      color: "from-blue-500 to-blue-600"
    },
    {
      step: "2",
      title: "Smart Authentication",
      description: "Speak to authenticate any transaction. Our advanced AI instantly verifies your identity using multi-factor voice analysis.",
      icon: <Shield className="w-12 h-12" />,
      color: "from-purple-500 to-purple-600"
    },
    {
      step: "3",
      title: "Secure Processing",
      description: "Your payment is processed through our intelligent routing system, ensuring optimal security, speed, and cost efficiency.",
      icon: <CreditCard className="w-12 h-12" />,
      color: "from-green-500 to-green-600"
    },
    {
      step: "4",
      title: "Instant Confirmation",
      description: "Receive immediate confirmation with full transaction details. Our 24/7 support team is ready to assist with any queries.",
      icon: <CheckCircle className="w-12 h-12" />,
      color: "from-teal-500 to-teal-600"
    }
  ];

  return (
    <div id="how-it-works" className="min-h-screen py-20 px-4 bg-gradient-to-b from-transparent to-black/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Get your{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              secure payments
            </span>
            <br />
            <span className="font-star-avenue relative inline-block tracking-wider">
              powered in a flash
              <span className="absolute -left-[20px] -bottom-1 w-[calc(100%+30px)] h-1.5 bg-gradient-to-r from-purple-400 to-blue-400"></span>
            </span>
          </h2>
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center text-teal-400 font-medium">
              <CheckCircle className="w-5 h-5 mr-2" />
              Quick setup in 2-3 minutes
            </div>
          </div>
        </div>

        <div className="relative">
        
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">               
                
                {/* Content Card */}
                <div className="text-center space-y-6">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r ${step.color} shadow-lg`}>
                    <div className="text-white">
                      {step.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white">
                    {step.title}
                  </h3>
                  
                  <p className="text-gray-300 leading-relaxed max-w-sm mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-20 text-center">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-2">Lightning Fast</h4>
                <p className="text-gray-300 text-sm">Process transactions in under 3 seconds</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-2">Bank-Level Security</h4>
                <p className="text-gray-300 text-sm">256-bit encryption with biometric verification</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-green-600 rounded-full flex items-center justify-center mb-4">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-2">24/7 Support</h4>
                <p className="text-gray-300 text-sm">Round-the-clock assistance for all queries</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;