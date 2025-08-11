import './ReportCard.css';
import { FaCheckCircle, FaTimesCircle, FaDesktop, FaMicrochip, FaUser, FaServer, FaNetworkWired } from "react-icons/fa";
import { MdDateRange } from "react-icons/md";
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportsPDF from '../PDFReport/PDFReport';

function DownloadPDFButton({ report }) {
    return (
        <PDFDownloadLink
            document={<ReportsPDF r={report} />}
            fileName="System_Compatibility_Reports.pdf"
            style={{
                padding: '10px 20px',
                backgroundColor: '#e40613',
                color: 'white',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 14
            }}
        >
            {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
        </PDFDownloadLink>
    );
}


export default function ReportCard({ report }) {
    const formattedDate = new Date(report.createdAt).toLocaleDateString();

    return (
        <div className="report-card">
            <div className="report-card-header">
                <div className="report-info">
                    <MdDateRange className="report-icon" />
                    <span className="label"></span>
                    <span>{formattedDate}</span>
                </div>
                <div className={`compatibility ${report.compatible === "Yes" ? 'compatible' : 'not-compatible'}`}>
                    {report.compatible === "Yes" ? (
                        <>
                            <FaCheckCircle className="status-icon" />
                            <span style={{ fontSize: '10px' }}>Compatible</span>
                        </>
                    ) : (
                        <>
                            <FaTimesCircle className="status-icon" />
                            <span style={{ fontSize: '10px' }}>Not Compatible</span>
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
                    <FaServer className="report-icon" />
                    <span className="label">Hostname:</span>
                    <span>{report.hostname}</span>
                </div>
                <div className="report-info">
                    <FaUser className="report-icon" />
                    <span className="label">Client:</span>
                    <span>{report.client}</span>
                </div>
                <div className="report-info">
                    <FaDesktop className="report-icon" />
                    <span className="label">Station Name:</span>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{report.stationName}</span>
                </div>
                <div className="report-info">
                    <FaNetworkWired className="report-icon" />
                    <span className="label">Public IP:</span>
                    <span>{report.publicIP}</span>
                </div>
                <div className='download-pdf'>
                    <DownloadPDFButton report={report} />
                </div>
            </div>
        </div>
    );
}
