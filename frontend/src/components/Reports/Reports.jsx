import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchReports } from "../../store/reports";
import './Reports.css'; // We'll define this below

export default function Reports() {
    const reports = useSelector(state => state.reports.reports);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchReports());
    }, [dispatch]);

    return (
        <div className="reports-wrapper">

            <main className="home-content">
                <section className="reports-section">
                    <h2 className="section-title">All Reports</h2>
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Created At</th>
                                    <th>Machine Code</th>
                                    <th>Hostname</th>
                                    <th>Compatible</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(report => (
                                    <tr key={report.id}>
                                        <td>{new Date(report.createdAt).toLocaleString()}</td>
                                        <td>{report.machineCode}</td>
                                        <td>{report.hostname}</td>
                                        <td className={report.compatible === 'Yes' ? 'yes' : 'no'}>
                                            {report.compatible}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <p>&copy; 2025 SMART Solutions. All rights reserved.</p>
            </footer>
        </div>
    );
}
