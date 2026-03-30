import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const POPULAR_ROLES = [
  // Technology
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Engineer",
  "Mobile Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Data Analyst",
  "Data Engineer",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "Cybersecurity Analyst",
  "QA Engineer",
  "UI/UX Designer",
  "IT Support Specialist",
  "Database Administrator",
  "Systems Administrator",
  "Network Engineer",
  // Business & Management
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "Business Development Manager",
  "Operations Manager",
  "Supply Chain Manager",
  "Logistics Coordinator",
  "Administrative Assistant",
  "Office Manager",
  "Executive Assistant",
  // Finance & Accounting
  "Accountant",
  "Financial Analyst",
  "Auditor",
  "Banking Officer",
  "Investment Analyst",
  "Tax Consultant",
  // Sales & Marketing
  "Sales Executive",
  "Sales Manager",
  "Marketing Manager",
  "Digital Marketing Specialist",
  "Social Media Manager",
  "SEO Specialist",
  "Content Writer",
  "Copywriter",
  "Public Relations Officer",
  "Brand Manager",
  // Human Resources
  "HR Manager",
  "Recruiter",
  "Training Coordinator",
  // Customer Service
  "Customer Service Representative",
  "Customer Success Manager",
  "Call Centre Agent",
  // Healthcare
  "Nurse",
  "Pharmacist",
  "Medical Doctor",
  "Lab Technician",
  "Public Health Officer",
  // Education
  "Teacher",
  "Lecturer",
  "Academic Researcher",
  "Education Coordinator",
  // Engineering
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Chemical Engineer",
  "Petroleum Engineer",
  "Environmental Engineer",
  // Creative & Media
  "Graphic Designer",
  "Video Editor",
  "Photographer",
  "Journalist",
  "Media Planner",
  // Legal & Compliance
  "Lawyer",
  "Legal Officer",
  "Compliance Officer",
  // Trades & Skilled
  "Graduate Trainee",
  "Intern",
  "Volunteer Coordinator",
];

const RoleCombobox = ({ value, onChange, placeholder = "e.g. Frontend Developer" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef(null);
  
  // Sync when parent value changes externally
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerChange = (val) => {
    onChange({
      target: {
        name: 'desiredTitle',
        value: val
      }
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    triggerChange(val);
    setIsOpen(true);
  };

  const handleSelectRole = (role) => {
    setInputValue(role);
    triggerChange(role);
    setIsOpen(false);
  };

  const filteredRoles = POPULAR_ROLES.filter(role => 
    role.toLowerCase().includes(inputValue.toLowerCase()) && role.toLowerCase() !== inputValue.toLowerCase()
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="input-field w-full pr-10"
          required
        />
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && filteredRoles.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1">
            {filteredRoles.map((role) => (
              <button
                key={role}
                type="button"
                className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => handleSelectRole(role)}
              >
                <span>{role}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleCombobox;
