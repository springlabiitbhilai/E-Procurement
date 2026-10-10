import { useState, useEffect } from "react";
import { API_URL, axiosInstance } from "../../config/api";
import { useLocation } from "react-router-dom";


 async function readPem(file) {
  const text = await file.text();
  return text
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
}

async function importPrivateKey(pem) {
  const binary = Uint8Array.from(atob(pem), c => c.charCodeAt(0));

  return await window.crypto.subtle.importKey(
    "pkcs8",
    binary.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

// async function signHash(privateKey, hashHex) {
//   const data = new TextEncoder().encode(hashHex);

//   const signature = await window.crypto.subtle.sign(
//     "RSASSA-PKCS1-v1_5",
//     privateKey,
//     data
//   );

//   return btoa(String.fromCharCode(...new Uint8Array(signature)));
// }

 
// for sorting top-level keys in payload
function canonicalPayload(obj) {
  const ordered = {};
  Object.keys(obj).sort().forEach(k => {
    ordered[k] = obj[k];
  });
  return ordered;
}

export default function PurchaseRequisitionForm() {
    // const [privateKeyFile, setPrivateKeyFile] = useState(null);
    const location = useLocation();
const isPrint = new URLSearchParams(location.search).get("print") === "true";
  const [form, setForm] = useState({
    name: "",
    department: "",
    budgetType: "",
    projectNo: "",
    budgetHead: "",
    budgetAmount: "",
    justification: "",
    interDept: "",
    materialType: "",
    itemDetails: "",
    gemAvailable: "",
    procurementMethod: "",
    otherMode: "",
    supplyRequirements: "",
    date: "",
    techRemarks:"",
    recommendationRemarks:"",
    suggestedSuppliers: [
      { name: "", email: "" },
      { name: "", email: "" },
      { name: "", email: "" },
      { name: "", email: "" },
      { name: "", email: "" },
    ],
  });
useEffect(() => {
  if (isPrint) {
    const saved = localStorage.getItem("printFormData");
    if (saved) {
      setForm(JSON.parse(saved));
    }
  }
}, [isPrint]);
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function updateSupplier(index, field, value) {
    const suppliers = [...form.suggestedSuppliers];
    suppliers[index][field] = value;
    setForm({ ...form, suggestedSuppliers: suppliers });
  }
  
async function handleSecureSubmit() {
  try {
    const response = await axiosInstance.post(
      `/purchase/submit`,
      form,
      {
        responseType: "blob", // IMPORTANT
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "PurchaseRequisition.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();

    alert("✅ PDF Generated Successfully");

  } catch (err) {
    console.error(err);
    alert("❌ Submission Failed");
  }
}
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen flex justify-center">
      <div className="bg-white p-4 sm:p-6 md:p-8 w-full max-w-5xl border">
        <h2 className="text-center font-bold text-lg sm:text-xl mb-4">
          Purchase Requisition Form
        </h2>
        <div className="text-right mb-4">
          <label className="font-semibold mr-2">Date:</label>
          {isPrint ? (
  <span className="border px-2 py-1 inline-block min-w-[120px]">
    {form.date}
  </span>
) : (
  <input
    type="date"
    name="date"
    value={form.date}
    onChange={handleChange}
    className="border px-2 py-1 outline-none"
  />
)}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse border">
          <tbody>
            {/* 1 */}
            <tr>
              <td className="border p-2 w-10">1</td>
              <td className="border p-2 font-semibold w-1/3">
                Name of Indenter
              </td>
              <td className="border p-2">
                {isPrint ? (
  <span className="block min-h-[24px]">{form.name}</span>
) : (
  <input
    name="name"
    value={form.name}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            {/* 2 */}
            <tr>
              <td className="border p-2">2</td>
              <td className="border p-2 font-semibold">Department which project, which PI</td>
              <td className="border p-2">
                
                {isPrint ? (
  <span className="block min-h-[24px]">{form.department}</span>
) : (
  <input
    name="department"
    value={form.department}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            {/* 3 */}
            <tr>
              <td className="border p-2">3</td>
              <td className="border p-2 font-semibold">
                Budget Head (Pl. Tick)
              </td>
              <td className="border p-2 flex gap-6">
                {["Project", "CPDA"].map((type) => (
  <label key={type} className="flex items-center gap-2">
    {isPrint ? (
      <span>
        {form.budgetType === type ? "☑" : "☐"} {type}
      </span>
    ) : (
      <>
        <input
          type="radio"
          name="budgetType"
          value={type}
          checked={form.budgetType === type}
          onChange={handleChange}
        />
        {type}
      </>
    )}
  </label>
))}
              </td>
            </tr>

            {/* 4 Header */}
            <tr>
              <td className="border p-2">4</td>
              <td colSpan="2" className="border p-2 font-semibold">
                Budget Details
              </td>
            </tr>

            <tr>
              <td className="border"></td>
              <td className="border p-2 font-semibold">
                Department Name / Project No.
              </td>
              <td className="border p-2">
                
                {isPrint ? (
  <span className="block min-h-[24px]">
    {form.projectNo}
  </span>
) : (
  <input
    name="projectNo"
    value={form.projectNo}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            <tr>
              <td className="border"></td>
              <td className="border p-2 font-semibold">Budget Head</td>
              <td className="border p-2">
                
                {isPrint ? (
  <span className="block min-h-[24px]">{form.budgetHead}</span>
) : (
  <input
    name="budgetHead"
    value={form.budgetHead}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            <tr>
              <td className="border"></td>
              <td className="border p-2 font-semibold">Budget Amount</td>
              <td className="border p-2">
                
                {isPrint ? (
  <span className="block min-h-[24px]">{form.budgetAmount}</span>
) : (
  <input
    name="budgetAmount"
    value={form.budgetAmount}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            {/* 5 */}
            <tr>
              <td className="border p-2">5</td>
              <td className="border p-2 font-semibold">
                Justification / Purpose of the procurement
              </td>
              <td className="border p-2">
                {isPrint ? (
  <div className="min-h-[60px] whitespace-pre-wrap">
    {form.justification}
  </div>
) : (
  <textarea
    rows="3"
    name="justification"
    value={form.justification}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            {/* 6 */}
            <tr>
              <td className="border p-2">6</td>
              <td className="border p-2 font-semibold">
                Wheather the material will be used Inter-departmentally?
              </td>
              <td className=" p-2 flex gap-6">
                {["Yes", "No"].map((v) => (
  <label key={v}>
    {isPrint ? (
      <span>
        {form.interDept === v ? "☑" : "☐"} {v}
      </span>
    ) : (
      <input
        type="radio"
        name="interDept"
        value={v}
        checked={form.interDept === v}
        onChange={handleChange}
      />
    )}
  </label>
))}
              </td>
            </tr>

            {/* 7 */}
            <tr>
              <td className="border p-2">7</td>
              <td className="border p-2 font-semibold">Type of Material</td>
              <td className="border p-2 flex gap-6">
                {["Consumable", "Asset", "NonConsumable"].map((type) => (
  <label key={type}>
    {isPrint ? (
      <span>
        {form.materialType === type ? "☑" : "☐"} {type}
      </span>
    ) : (
      <input
        type="radio"
        name="materialType"
        value={type}
        checked={form.materialType === type}
        onChange={handleChange}
      />
    )}
  </label>
))}

                <label>
                  <input
                    type="radio"
                    name="materialType"
                    value="Asset"
                    onChange={handleChange}
                  />{" "}
                  Limited Time Asset
                </label>

                <label>
                  <input
                    type="radio"
                    name="materialType"
                    value="NonConsumable"
                    onChange={handleChange}
                  />{" "}
                  Non-Consumables
                </label>
              </td>
            </tr>

            {/* 8 */}
            <tr>
              <td className="border p-2">8</td>
              <td className="border p-2">
                Details of the item/s to be procured.
              </td>
              <td className="border p-2">
                
                {isPrint ? (
  <div className="min-h-[60px] whitespace-pre-wrap">
    {form.itemDetails}
  </div>
) : (
  <textarea
    rows="3"
    name="itemDetails"
    value={form.itemDetails}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}

              </td>
            </tr>

            {/* 9 */}
            <tr>
              <td className="border p-2">9</td>
              <td className="border p-2">
                Availability of the item in GeM (Govt. e-Marketplace) Portal:
              </td>
              <td className="border p-2">
                {isPrint ? (
  <span>{form.gemAvailable}</span>
) : (
  <select
    name="gemAvailable"
    value={form.gemAvailable}
    onChange={handleChange}
    className="w-full outline-none"
  >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
)}
              </td>
            </tr>

            {/* 10 */}
            <tr>
              <td className="border p-2">10</td>
              <td className="border p-2">
                Procurement method <br />
                (*For PAC Procurement, PAC certificate or Justification should
                be attached)
              </td>
              <td className="border p-2">
  {isPrint ? (
    <span>{form.procurementMethod}</span>
  ) : (
    <>
      <select
        name="procurementMethod"
        value={form.procurementMethod}
        onChange={handleChange}
        className="w-full outline-none"
      >
        <option value="">Select Method</option>
        <option>GeM</option>
        <option>Open Tender</option>
        <option>Limited Tender</option>
        <option>PAC</option>
        <option>Other</option>
      </select>

      {form.procurementMethod === "Other" && (
        <input
          name="otherMode"
          placeholder="Specify"
          onChange={handleChange}
          className="w-full mt-2 outline-none"
        />
      )}
    </>
  )}
</td>
            </tr>

            {/* 11 */}
            <tr>
              <td className="border p-2">11</td>
              <td className="border p-2">
                Any specific supplying requirements: (To be mentioned clearly by
                the indenter)
              </td>
              <td className="border p-2">
                
                {isPrint ? (
  <div className="min-h-[60px] whitespace-pre-wrap">
    {form.supplyRequirements}
  </div>
) : (
  <textarea
    rows="3"
    name="supplyRequirements"
    value={form.supplyRequirements}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
              </td>
            </tr>

            {/* 12 Suppliers */}
            <tr>
              <td className="border p-2">12</td>
              <td className="border p-2">
                Suggested Supplier(s)* :- <br />
                *In case of limited tender, minimum five potential bidders/
                suppliers must be included.
              </td>
              <td className="border p-2">
                <table className="w-full border">
                  <thead>
                    <tr>
                      <th className="border p-1">S.No</th>
                      <th className="border p-1">Name & Address</th>
                      <th className="border p-1">
                        Email (Registered with CPP Portal) & Contact No.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.suggestedSuppliers.map((s, i) => (
                      <tr key={i}>
                        <td className="border p-1">{i + 1}</td>
                        <td className="border p-1">
                          {isPrint ? (
  <span>{s.name}</span>
) : (
  <input
    className="w-full outline-none"
    value={s.name}
    onChange={(e) =>
      updateSupplier(i, "name", e.target.value)
    }
  />
)}
                          
                        </td>
                        <td className="border p-1">
                          
                          {isPrint ? (
  <span>{s.email}</span>
) : (
  <input
    className="w-full outline-none"
    value={s.email}
    onChange={(e) =>
      updateSupplier(i, "email", e.target.value)
    }
  />
)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          
        {/* Technical Specifications Section */}
        <tr>
          <td colSpan="3" className="border p-3">
            <div className="text-right mb-2 mt-4 font-semibold">
              Signature of Indenter
            </div>

            <div className="border-t border-b text-center font-semibold py-1">
              Technical specifications checked & verified by
            </div>

            <div className="mt-2">
              <label className="font-semibold">Remarks (if any):</label>
              
              {isPrint ? (
  <div className="min-h-[60px] whitespace-pre-wrap">
    {form.techRemarks}
  </div>
) : (
  <textarea
    rows="3"
    name="techRemarks"
    value={form.techRemarks}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-6">
              <div>Member</div>
              <div>Member</div>
              <div>Member</div>
              <div>Member</div>
            </div>

            <p className="text-sm mt-2 italic">
              *Purchases related to all cases should be checked & verified by
              related DPC / IPC / CIF Purchase Committee.
            </p>
          </td>
        </tr>

        {/* Recommendation Section */}
        <tr>
          <td colSpan="3" className="border p-3">
            <div className="border-t border-b text-center font-semibold py-1">
              Recommendation and Certification
            </div>

            <div className="mt-2">
              <label className="font-semibold">Remarks (if any):</label>
              
              {isPrint ? (
  <div className="min-h-[60px] whitespace-pre-wrap">
    {form.recommendationRemarks}
  </div>
) : (
  <textarea
    rows="3"
    name="recommendationRemarks"
    value={form.recommendationRemarks}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
            </div>

            <p className="mt-3 text-sm">
              I certify that the items being requisitioned for purchase are not
              stocked in the department in sufficient numbers and these items
              are required in numbers in addition to those stocked in the
              department.
            </p>

            <div className="mt-4 text-right font-semibold">
              Faculty In-charge (DoAA / DoFA / DoSA / DoRD) / HoD / Registrar
            </div>

            <div className="mt-4 mb-4 text-sm italic space-y-1">
              <p>
                *Purchase related to Academic affairs to be recommended by
                Faculty I/c DoAA
              </p>
              <p>
                *Purchase related to Faculty affairs to be recommended by
                Faculty I/c DoFA
              </p>
              <p>
                *Purchase related to Student affairs to be recommended by
                Faculty I/c DoSA
              </p>
              <p>
                *Purchase related to Research/Projects to be recommended by
                Faculty I/c DoRD
              </p>
              <p>
                *Purchase related to all other cases to be recommended by HoD /
                Registrar.
              </p>
            </div>

            <div className="border-t border-b text-center font-semibold py-1">
              Availability of Fund (to be verified by Account Section &
              Recommended by Registrar)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-6 mb-4">
              <div>Dealing Asst. (F&A/R&D)</div>
              <div>Deputy Registrar ( F&A/ R&D) </div>
              <div>Registrar</div>
            </div>
          </td>
        </tr>
</tbody>
        </table>
        </div>
        <div className="border-t border-b text-center font-semibold py-1">
          Approval of the Competent Authority
        </div>

        <div className="mt-2">
          <label className="font-semibold">Remarks (if any):</label>
           {isPrint ? (
  <div className="min-h-[60px] whitespace-pre-wrap">
    {form.techRemarks}
  </div>
) : (
  <textarea
    rows="3"
    name="techRemarks"
    value={form.techRemarks}
    onChange={handleChange}
    className="w-full outline-none"
  />
)}
        </div>

        <div className="grid  text-right mt-6">HOD/DORD/Registrar/Director</div>
     {/* <div className="mt-6">
  <label className="font-semibold">Upload Private Key:</label>
  <input
    type="file"
    accept=".pem"
    onChange={(e) => setPrivateKeyFile(e.target.files[0])}
    className="block mt-2"
  />
</div> */}

{!isPrint && (
  <button
    type="button"
    onClick={handleSecureSubmit}
    className="bg-blue-600 text-white px-6 py-2 mt-4"
  >
    Submit Securely
  </button>
)}

      </div>
    </div>
  );
}
