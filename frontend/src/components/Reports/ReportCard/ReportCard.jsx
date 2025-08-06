import './ReportCard.css';
import { FaCheckCircle, FaTimesCircle, FaDesktop, FaMicrochip, FaUser } from "react-icons/fa";
import { MdDateRange } from "react-icons/md";

export default function ReportCard({ report }) {
    const formattedDate = new Date(report.createdAt).toLocaleDateString();

    return (
        <div className="report-card">
            <div className="report-card-header">
                <div className="report-info">
                    <MdDateRange className="report-icon" />
                    <span className="label">Date:</span>
                    <span>{formattedDate}</span>
                </div>
                <div className={`compatibility ${report.compatible === "Yes" ? 'compatible' : 'not-compatible'}`}>
                    {report.compatible === "Yes" ? (
                        <>
                            <FaCheckCircle className="status-icon" />
                            <span>Compatible</span>
                        </>
                    ) : (
                        <>
                            <FaTimesCircle className="status-icon" />
                            <span>Not Compatible</span>
                        </>
                    )}
                </div>
            </div>

            <div className="report-card-body">
                <div className="report-info">
                    <FaMicrochip className="report-icon" />
                    <span className="label">Machine Code:</span>
                    <span>{report.machineCode}</span>
                </div>
                <div className="report-info">
                    <FaDesktop className="report-icon" />
                    <span className="label">Hostname:</span>
                    <span>{report.hostname}</span>
                </div>
                <div className="report-info">
                    <FaUser className="report-icon" />
                    <span className="label">Client:</span>
                    <span>{report.client}</span>
                </div>
            </div>
        </div>
    );
}
