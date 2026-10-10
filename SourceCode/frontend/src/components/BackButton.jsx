import { useNavigate } from "react-router-dom";

export default function BackButton({ label = "← Back", to = null }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to); // specific route
    } else {
      navigate(-1); // go back
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm sm:text-base"
    >
      <span className="font-medium">{label}</span>
    </button>
  );
}