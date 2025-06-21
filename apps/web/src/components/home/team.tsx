"use client";

export default function TeamPage() {
  const teamMembers = [
    {
      name: "MANAS MADAN",
      image: "/team/manas.jpg",
      role: "SDE INTERN @ MYSTRO INC",
      position: "President, Google DSC NSUT",
      education: "BTech ICE 2026",
    },
    {
      name: "AJAY PAL SINGH",
      image: "/team/ajay.jpeg",
      role: "SDE INTERN @ MYSTRO INC",
      position: "Web Dev Lead, Google DSC NSUT",
      education: "BTech CSE 2027",
    },
    {
      name: "KAVISH DHAM",
      image: "/team/kavish.jpeg",
      role: "SDE INTERN @ EXPEDIA GROUP",
      position: "Vice President, Devcomm NSUT",
      education: "BTech IT 2026",
    },
  ];

  return (
    <div
      id="team"
      className="max-w-7xl mx-auto px-6 md:px-8 pb-12 flex flex-wrap justify-evenly gap-x-8 gap-y-8 place-items-center md:gap-12 lg:gap-16"
    >
      {teamMembers.map((member, index) => (
        <div key={index} className="flex flex-col items-center text-center">
          <div className="relative overflow-hidden rounded-full aspect-square w-40 sm:w-64 md:w-72 lg:w-80 mb-4">
            <img
              src={member.image || "/placeholder.svg"}
              alt={member.name}
              className="rounded-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-wide">
              {member.name}
            </h2>
            <div className="space-y-2 md:text-lg text-gray-300">
              <p className="font-medium">{member.role}</p>
              <p>{member.position}</p>
              <p>{member.education}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
