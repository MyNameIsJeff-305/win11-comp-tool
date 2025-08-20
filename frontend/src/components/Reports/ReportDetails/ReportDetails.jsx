import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getReportThunk } from '../../../store/reports';

import './ReportDetails.css';

export default function ReportDetails() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // const user = useSelector((state) => state.session.user);
    const report = useSelector((state) => state.reports.report)

    const { reportId } = useParams();

    console.log("ReportDetails reportId:", reportId);

    useEffect(() => {
        dispatch(getReportThunk(parseInt(reportId)))
    }, [dispatch, reportId]);

    return (
        <div>
            <div className="reports-header">
                <div>
                    <h1>Reports</h1>
                </div>
            </div>
            <div className="report-details-container">
                <button className="back-button" onClick={() => navigate('/reports')}>Back to Reports</button>
                {report ? (
                    <div className="report-details-card">
                        <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
                        <p><strong>Machine Code:</strong> {report.machineCode}</p>
                        <p><strong>CPU:</strong> {report.cpu}</p>
                        <p><strong>RAM:</strong> {report.ram} GB</p>
                        <p><strong>Storage:</strong> {report.storage} GB</p>
                        <p><strong>TPM Version:</strong> {report.tpmVersion}</p>
                        <p><strong>Secure Boot Enabled:</strong> {report.secureBootEnabled ? 'Yes' : 'No'}</p>
                        <p><strong>Compatibility:</strong> {report.compatible}</p>
                        {report.incompatibilityReasons && report.incompatibilityReasons.length > 0 && (
                            <>
                                <h3>Incompatibility Reasons:</h3>
                                <ul>
                                    {report.incompatibilityReasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                ) : (
                    <p>Loading report details...</p>
                )}
            </div>
        </div>
    );
}