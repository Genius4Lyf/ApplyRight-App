import React from 'react';
import { Target, CheckCircle, XCircle, Lightbulb } from 'lucide-react';

const ATSGuide = ({ step }) => {
    // Content tailored to each step
    const guideContent = {
        target_job: {
            title: "Targeting the Role",
            why: "ATS algorithms match your resume against specific keywords in the job description. Providing the job details allows our AI to tailor your resume specifically for that role.",
            dos: ["Paste the full job description", "Include the exact job title"],
            donts: ["Paste just the company name", "Leave it blank if you have a specific role in mind"],
            example: "Software Engineer at Google"
        },
        heading: {
            title: "Contact Info & Header",
            why: "This is the first thing recruiters see. ATS needs clear, standard formatting to parse your contact details correctly.",
            dos: ["Use a professional email (firstname.lastname@gmail.com)", "Include your LinkedIn URL", "Keep it clean and minimal"],
            donts: ["Include your full physical address (City/State is enough)", "Include photos (unless in specific regions)", "Use fancy fonts for your name"],
            example: "Jane Doe | London, UK | jane@email.com"
        },
        summary: {
            title: "Professional Summary",
            why: "A strong summary acts as your elevator pitch. It should instantly communicate your value and match the core requirements of the job.",
            dos: ["Keep it under 4 lines", "Mention years of experience + top skills", "Tailor it to the Target Job"],
            donts: ["Use generic cliches ('Hard worker')", "Write a full cover letter here", "Talk about what you want, focus on what you offer"],
            example: "Results-oriented Marketing Manager with 5+ years driving 40% growth..."
        },
        history: {
            title: "Work History",
            why: "This is the most critical section. ATS scans for job titles, companies, dates, and achievement-based keywords.",
            dos: ["Use reverse chronological order", "Start bullets with strong action verbs", "Quantify results (e.g., 'Increased sales by 20%')"],
            donts: ["List just duties ('Responsible for X')", "Leave gaps in employment unexplained", "Use tables or columns which confuse parsers"],
            example: "Spearheaded a team of 5 devs to launch feature X..."
        },
        projects: {
            title: "Projects",
            why: "Projects demonstrate applied skills. They are crucial for technical roles or career changers to show capability.",
            dos: ["Link to live demos or repos", "Explain the 'Why' and 'How'", "Mention technologies used"],
            donts: ["List trivial school assignments (unless entry level)", "Forget to mention your specific contribution"],
            example: "E-Commerce App: Built full-stack platform using React/Node..."
        },
        education: {
            title: "Education",
            why: "Verifies your qualifications. ATS checks for degrees matching the job requirements.",
            dos: ["List degree, major, and school", "Include graduation year", "Mention honors if recent grad"],
            donts: ["Include high school (unless you have no degree)", "List every single course taken"],
            example: "BSc Computer Science, Oxford University"
        },
        skills: {
            title: "Skills",
            why: "The keyword bank. ATS matches these directly against the Job Description requirements.",
            dos: ["Group skills logically", "Include hard skills (Tools, Tech)", "Include languages"],
            donts: ["List generic soft skills ('Good communicator') without context", "Lie about proficiency"],
            example: "JavaScript, React, Python, AWS, Agile Leadership"
        },
        finalize: {
            title: "Final Review",
            why: "The last check before export. Ensure formatting is consistent and no typos exist.",
            dos: ["Proofread twice", "Check consistency in dates", "Ensure correct template selection"],
            donts: ["Ignore spelling errors", "submit a Word doc if PDF is requested"],
            example: "Ready to export!"
        }
    };

    const content = guideContent[step] || guideContent.heading;

    return (
        <div className="w-full h-full bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6 text-indigo-900 border-b border-indigo-100 pb-4">
                <Target className="w-5 h-5" />
                <h3 className="font-bold text-lg">ATS Success Guide</h3>
            </div>

            <div className="space-y-8">
                {/* Section 1: Why it matters */}
                <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Why this matters
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        {content.why}
                    </p>
                </div>

                {/* Section 2: Dos */}
                <div>
                    <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Professional Do's
                    </h4>
                    <ul className="space-y-2">
                        {content.dos.map((item, idx) => (
                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Section 3: Don'ts */}
                <div>
                    <h4 className="font-semibold text-rose-800 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        Common Mistakes
                    </h4>
                    <ul className="space-y-2">
                        {content.donts.map((item, idx) => (
                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>


            </div>
        </div>
    );
};

export default ATSGuide;
