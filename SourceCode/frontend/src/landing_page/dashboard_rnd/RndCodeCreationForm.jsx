import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../components/BackButton";
import Select from "react-select";
import {
  readPem,
  importPrivateKey,
  signData,
  canonicalPayload,
} from "../../../src/utils/digitalSignature";
import { API_URL, axiosInstance } from "../../config/api";

// component
export default function RndCodeCreationForm({ onClose }) {

  const [piList, setPiList] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  const [formData, setFormData] = useState({
    projectCode: "",
    department: "",
    piEmpId: "",
    piName: "",
    sequenceNumber: "",
    year: "",
    privateKeyFile: null,
  });
  const [errors, setErrors] = useState({});

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // clear field error
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (name === "department") {
      setLoadingCode(true);

      try {
        const res = await axiosInstance.post(`/api/projects/project-code`, {
          department: value,
        });

        const data = res.data;

        setFormData((prev) => ({
          ...prev,
          department: value,
          projectCode: data.projectCode,
          sequenceNumber: data.sequenceNumber,
          year: data.year,
        }));
      } catch (err) {
        console.error(err);
        alert("Error generating project code");

        setFormData((prev) => ({
          ...prev,
          projectCode: "",
        }));
      } finally {
        setLoadingCode(false);
      }

      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // pilist for dropdown list
  useEffect(() => {
    axiosInstance
    .get("/api/projects/pi-list")
    .then((res) => setPiList(res.data))
    .catch((err) => console.error(err));
  }, []);
  const options = piList.map((pi) => ({
    value: pi.fullName,
    label: `${pi.fullName}`,
  }));

  const validate = () => {
    let newErrors = {};

    if (!formData.department) {
      newErrors.department = "Department is required";
    }

    // if (!formData.totalFundReceived) {
    //   newErrors.totalFundReceived = "Total fund is required";
    // } else if (Number(formData.totalFundReceived) <= 0) {
    //   newErrors.totalFundReceived = "Amount must be greater than 0";
    // }

    // if (!formData.bankTransactionId) {
    //   newErrors.bankTransactionId = "Transaction ID is required";
    // }

    if (!formData.piEmpId) {
      newErrors.piEmpId = "Please select a PI";
    }

    if (!formData.privateKeyFile) {
      newErrors.privateKeyFile = "Private key is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    if (!validate()) return;

    const payload = canonicalPayload({
      projectCode: formData.projectCode,
      department: formData.department,
      piEmpId: formData.piEmpId,
      piName: formData.piName,
    });

    const pem = await readPem(formData.privateKeyFile);

    const privateKey = await importPrivateKey(pem);

    const signature = await signData(privateKey, payload);

    const res = await axiosInstance.post(`/api/projects`, {
      ...formData,
      payload,
      signature,
    },
     {
  });

    setSuccess(true);

  } catch (err) {
    console.error(err);

    alert(
      err.response?.data?.message ||
      "Signature verification failed"
    );
  }
};

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700">
          Create Project Code
        </h2>

        <button onClick={onClose} className="text-red-500 hover:text-red-700">
          ✕
        </button>
      </div>

      {success ? (
        <div className="bg-green-100 border border-green-300 text-green-700 p-4 rounded-lg text-center">
          ✅ Project Successfully Created & Sent to PI
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Department
            </label>

            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="ELECTRICAL">ELECTRICAL</option>
              <option value="MECHANICAL">MECHANICAL</option>
              <option value="CIVIL">CIVIL</option>
            </select>
            {errors.department && (
              <p className="text-red-500 text-sm">{errors.department}</p>
            )}
          </div>

          {/* Project Code */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Project Code
            </label>

            <input
              type="text"
              value={loadingCode ? "Generating..." : formData.projectCode}
              disabled
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          {/* Total Fund Received  */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Total Fund Received
            </label>

            <input
              type="number"
              name="totalFundReceived"
              value={formData.totalFundReceived}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
            {errors.totalFundReceived && (
              <p className="text-red-500 text-sm">{errors.totalFundReceived}</p>
            )}
          </div> */}

          {/* Transaction ID */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Bank Transaction ID
            </label>

            <input
              type="text"
              name="bankTransactionId"
              value={formData.bankTransactionId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
            {errors.bankTransactionId && (
              <p className="text-red-500 text-sm">{errors.bankTransactionId}</p>
            )}
          </div> */}

          {/* PI Employee ID */}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              PI Name
            </label>

            <Select
              className="w-full rounded-lg text-sm font-medium text-gray-600 focus:ring-blue-500"
              options={options}
              value={options.find((opt) => opt.value === formData.piName)}
              onChange={(selected) => {
                const selectedPI = piList.find(
                  (pi) => pi.fullName === selected.value,
                );

                setFormData((prev) => ({
                  ...prev,
                  piEmpId: selectedPI.employeeId,
                  piName: selectedPI.fullName,
                }));

                // clear error (important UX improvement)
                setErrors((prev) => ({
                  ...prev,
                  piName: "",
                }));
              }}
              placeholder="Select PI Full Name"
              maxMenuHeight={120}
            />

            {errors.piName && (
              <p className="text-red-500 text-sm">{errors.piName}</p>
            )}
          </div>

          {/* PI Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              PI Employee ID
            </label>

            <input
              type="text"
              name="piEmpId"
              value={formData.piEmpId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-gray-100"
              disabled
            />
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex flex-col sm:flex-row sm:justify-end sm:items-end gap-4 mt-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Upload Signing Key
              </label>

              <input
                type="file"
                name="privateKeyFile"
                accept=".pem"
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    privateKeyFile: e.target.files[0],
                  }));

                  setErrors((prev) => ({
                    ...prev,
                    privateKeyFile: "",
                  }));
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
              {errors.privateKeyFile && (
                <p className="text-red-500 text-sm">{errors.privateKeyFile}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loadingCode || !formData.projectCode}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md w-full sm:w-auto"
            >
              Sign & Send to PI
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
