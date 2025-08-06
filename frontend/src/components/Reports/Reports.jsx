import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchReports } from "../../store/reports";
import { useNavigate } from 'react-router-dom';
import './Reports.css';
import ReportCard from "./ReportCard/ReportCard";

export default function Reports() {
    const { reports, currentPage, totalPages } = useSelector(state => state.reports.reports);
    const user = useSelector(state => state.session.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        dispatch(fetchReports({ page, search: searchQuery }));
    }, [dispatch, page, searchQuery]);

    if (!user) {
        navigate('/');
        return null;
    }

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    return (
        <div className="reports-wrapper">
            <main className="home-content">
                <section className="reports-section">
                    <h2 className="section-title">All Reports</h2>
                    <div className="filters">
                        <input
                            type="text"
                            placeholder="Search by machine code, hostname, or compatibility..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="table-container">
                        {reports && reports.length > 0 ? (
                            <div>
                                {
                                    reports.map(report => (
                                        <ReportCard key={report.id} report={report} />
                                    ))
                                }
                            </div>
                        ) : (
                            <p>No reports available.</p>
                        )}
                    </div>

                    <div className="pagination-controls">
                        <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous</button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next</button>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <p>&copy; 2025 SMART Solutions. All rights reserved.</p>
            </footer>
        </div>
    );
}
