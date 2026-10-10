import AuthCard from "../context/AuthCard";

function AuthPageWrapper() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Background image */}
      <img
        src="../../assets/iitbhilai1.jpg"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[var(--primary)]/50"></div>

      {/* Content Area — stacks on mobile, side-by-side from lg up */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 lg:gap-12 px-4 sm:px-8 lg:px-20 py-8 lg:py-0 min-h-screen">
        {/* LEFT SIDE TEXT */}
        <div className="text-white space-y-3 max-w-xl animate-fadeInUp text-center lg:text-left">
          {/* <h3 className="text-sm sm:text-base md:text-lg font-semibold tracking-wide text-[var(--soft)] drop-shadow-md">
            PROCUREMENT 2025
          </h3> */}

          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight
bg-gradient-to-r from-[#eff6e0] to-[#aec3b0]
text-transparent bg-clip-text drop-shadow-xl text-center"
          >
            R&D PROCESS MANAGEMENT SYSTEM
          </h1>

          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-[var(--light)] drop-shadow-md tracking-wide text-center">
            Fund Allocation & Approvals
          </h2>
        </div>

        {/* RIGHT SIDE AUTH FORM */}
        <AuthCard />
      </div>
    </div>
  );
}

export default AuthPageWrapper;
