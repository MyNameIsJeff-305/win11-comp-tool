import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getAllReportsThunk, getTotalReportsAmountThunk } from "../../store/reports";
import { useNavigate } from 'react-router-dom';
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import './Reports.css';
import ReportCard from "./ReportCard/ReportCard";

export default function Reports() {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const allReports = useSelector(state => state.reports.allReports);
    const totalReports = useSelector(state => state.reports.totalReports);
    const user = useSelector(state => state.session.user);

    const [page, setPage] = useState(1);

    const REPORTS_PER_PAGE = 12;

    useEffect(() => {
        dispatch(getTotalReportsAmountThunk());
        dispatch(getAllReportsThunk(page, REPORTS_PER_PAGE));
        console.log();
    }, [dispatch, page]);

    const lastPage = Math.ceil(totalReports / REPORTS_PER_PAGE);

    if (!user) {
        navigate('/');
        return null;
    }

    if (!allReports || !totalReports) return (
        <section className='tickets-tab'>
            <span className="loader"></span>
        </section>
    )

    return (
        <section className='reports-tab'>
            <div>
                <div className="reports-header">
                    <h1>Reports</h1>
                </div>
                <div className="reports-list">
                    {allReports.map(report => (
                        <ReportCard key={report.id} report={report} />
                    ))}
                </div>
            </div>
            <div className='reports-footer'>
                <button className='prev-btn' style={{ border: "none" }} disabled={page <= 1} onClick={() => setPage(page - 1)}><FaAngleLeft /></button>
                <div>
                    <span >
                        {page} of {lastPage}
                    </span>
                </div>
                <button className='next-btn' style={{ border: "none" }} disabled={page >= lastPage} onClick={() => setPage(page + 1)}><FaAngleRight /></button>
            </div>
        </section>
    );
}
