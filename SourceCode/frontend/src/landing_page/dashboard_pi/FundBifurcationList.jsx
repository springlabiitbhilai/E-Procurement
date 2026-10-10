// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import BackButton from "../../components/BackButton";
// import { API_URL, axiosInstance } from "../../config/api";

// export default function FundBifurcationList() {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const navigate = useNavigate();
//   useEffect(() => {
//     fetchProjects();
//   }, []);

//   const fetchProjects = async () => {
//     try {
//       const res = await axiosInstance.get(`/api/projects`, {
//       });
//       setProjects(res.data);
//     } catch (err) {
//       console.error("Error fetching projects:", err);
//     } finally {
//       setLoading(false);
//     }
//   };
//   if (loading) return <p className="text-center mt-5">Loading....</p>;
//   return (
//     <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-8">
//       <div className="flex justify-end mb-4">
//         <BackButton />
//       </div>
//       <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6">
//         Projects Pending Bifurcation (List of Unbifurcated Projects)
//       </h2>

//       {projects.length === 0 ? (
//         <p>No projects found</p>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//           {projects.map((proj, index) => (
//             <div key={index}>
//               {/* NON-BIFURCATED PROJECTS */}

//               <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow hover:shadow-lg transition duration-300">
//                 {/* Project Code */}
//                 <h5 className="text-lg font-semibold text-gray-800 mb-2">
//                   {proj.projectCode}{" "}
//                   <span className="text-yellow-500 px-4 font-medium ml-1">
//                     Pending ⏳
//                   </span>
//                 </h5>

//                 {/* PI Name */}
//                 <p className="text-sm text-gray-600">
//                   <span className="font-medium text-gray-700">PI:</span>{" "}
//                   {proj.piName}
//                 </p>

//                 {/* Funds */}
//                 <p className="text-sm text-gray-600 mt-1">
//                   <span className="font-medium text-gray-700">Funds:</span> ₹
//                   {proj.totalFundReceived}
//                 </p>

//                 {/* Transaction */}
//                 <p className="text-sm text-gray-600 mt-1 mb-3">
//                   <span className="font-medium text-gray-700">Txn ID: </span>{" "}
//                   {proj.bankTransactionId}
//                 </p>

//                 {/* Button */}
//                 <button
//                   onClick={() => navigate(`/projects/${proj._id}`)}
//                   className="w-full bg-yellow-500  text-white  py-1.5 rounded-lg hover:bg-yellow-600 transition"
//                 >
//                   Do Bifurcation
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }