import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getAllReportsThunk, getTotalReportsAmountThunk } from "../../store/reports";
import { useNavigate } from "react-router-dom";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import "./Reports.css";
import ReportCard from "./ReportCard/ReportCard";

export default function Reports() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const REPORTS_PER_PAGE = 12;

    const allReports = useSelector((state) => state.reports.allReports.reports);
    const totalReports = useSelector((state) => state.reports.allReports.totalReports);
    const user = useSelector((state) => state.session.user);

    const [compatibilityFilter, setCompatibilityFilter] = useState("all"); // Default filter state

    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState(""); // Search input state


    useEffect(() => {
        // Reset page to 1 when compatibility filter changes
        setPage(1);
    }, [compatibilityFilter, searchTerm]);

    // Fetch total count and reports whenever page or searchTerm changes
    useEffect(() => {
        const compatibleParam = compatibilityFilter === "all" ? '' : compatibilityFilter;
        // Fetch total count filtered by searchTerm
        dispatch(getTotalReportsAmountThunk(searchTerm, compatibleParam));
        // Fetch filtered reports with pagination
        dispatch(getAllReportsThunk(page, REPORTS_PER_PAGE, searchTerm, compatibleParam));
    }, [dispatch, page, searchTerm, compatibilityFilter]);

    const lastPage = Math.ceil(totalReports / REPORTS_PER_PAGE);

    if (!user) {
        navigate("/");
        return null;
    }

    //Show loader while fetching data. If no data, show friendly message.
    if (!allReports || !totalReports)
        return (
            <>
                <span className="loader"></span>
                <p>Loading reports...</p>
            </>
        );

    // Handle form submission to avoid page reload
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1); // Reset to first page on new search
    };

    return (
        <section className="reports-tab">
            <div>
                <div className="reports-header">
                    <div>
                        <h1>Reports</h1>
                    </div>
                    <div className="filter-controls">
                        <div className="search-form">
                            <form onSubmit={handleSearchSubmit}>
                                <input
                                    type="text"
                                    placeholder="Search reports..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ padding: "6px 8px", width: "250px" }}
                                />
                                <button type="submit" style={{ marginLeft: "8px", padding: "6px 12px" }}>
                                    Search
                                </button>
                            </form>
                        </div>
                        <div className="filterss">
                            <div className="filters">
                                <div>
                                    <input type="radio" id="all" name="compatible" value="all" checked={compatibilityFilter === "all"} onChange={() => setCompatibilityFilter('all')} />
                                    <label htmlFor="all">All</label>
                                </div>
                                <div>
                                    <input type="radio" id="compatible" name="compatible" value="yes" checked={compatibilityFilter === "yes"} onChange={() => setCompatibilityFilter('yes')} />
                                    <label htmlFor="compatible">Compatible</label>
                                </div>
                                <div>
                                    <input type="radio" id="not-compatible" name="compatible" value="no" checked={compatibilityFilter === "no"} onChange={() => setCompatibilityFilter('no')} />
                                    <label htmlFor="not-compatible">Not Compatible</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="reports-list">
                    {allReports.length === 0 ? (
                        <p>No reports found.</p>
                    ) : (
                        allReports.map((report) => <ReportCard key={report.id} report={report} />)
                    )}
                </div>
            </div>

            <div className="reports-footer">
                <button
                    className="prev-btn"
                    style={{ border: "none" }}
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                >
                    <FaAngleLeft />
                </button>
                <div>
                    <span>
                        {page} of {lastPage}
                    </span>
                </div>
                <button
                    className="next-btn"
                    style={{ border: "none" }}
                    disabled={page >= lastPage}
                    onClick={() => setPage(page + 1)}
                >
                    <FaAngleRight />
                </button>
            </div>
        </section>
    );
}
