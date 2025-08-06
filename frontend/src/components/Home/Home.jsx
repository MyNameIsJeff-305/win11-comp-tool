import './Home.css';

export default function Home() {
    // Function to handle downloading the tool
    const downloadTool = async () => {
        // Download the tool located at public/SMART-Win11Check.exe, no need to fetch it
        const link = document.createElement('a');
        link.href = '/SMART-Win11Check.exe';
        link.download = 'SMART-Win11Check.exe';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="home-wrapper">
            <main className="home-content">
                <div className='hero-section'>
                    <h2>Welcome to the Windows 11 Compatibility Tool</h2>
                    <p>This tool helps you determine if your current hardware is compatible with Windows 11.</p>
                    <a onClick={downloadTool} className="btn-red">Download the Tool</a>
                </div>
            </main>
        </div>
    );
}
