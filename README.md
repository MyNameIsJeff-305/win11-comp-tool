# Windows 11 Compatibility Tool

**A Windows 11 Compatibility Tool** for users to report which workstations are ready for an upgrade to Windows 11. Suitable for any IT Company looking for have a reporting of which client stations are ready for an upgrade.

---

## Table of Contents

- [Overview](#overview)  
- [Features](#features)  
- [Installation](#installation)  
- [Usage](#usage)  
- [Contributing](#contributing)  
- [License](#license)  
- [Contact](#contact)

---

## Overview

**win11-comp-tool** is a user-oriented application that allows individuals or system administrators to evaluate and record whether a workstation meets the system requirements for upgrading to Windows 11. This process is a 2-part workflow when Users Download and run a .exe file, and the Web Application  generates a PDF Report with all the info gathered by the .exe script.

---

## Features

- **Check Compatibility**: Evaluate whether a machine meets Windows 11 requirements (e.g., CPU, TPM, Secure Boot).  
- **User Reporting**: Submit compatibility results to a centralized system or database.  
- **Dashboard View**: Simple frontend interface to visualize which workstations are ready for upgrade.  
- **Modular Design**: Clean separation between backend logic (e.g., compatibility checks, API endpoints) and frontend UI.

---

## Installation

### Prerequisites

- Node.js (version X.Y.Z or later)  
- npm or yarn  
- Other dependencies such as a database if applicable
- Recommended Database Dialects: SQLite for Development, PostgreSQL for Production.

### Steps

1. Clone the repository:
    ```sh
    git clone https://github.com/MyNameIsJeff-305/win11-comp-tool.git
    cd win11-comp-tool
    ```

2. Install dependencies:
    ```sh
    cd backend
    npm install

    cd ../frontend
    npm install
    ```

3. Configure environment variables:
    ```env
    # Example .env
    PORT
    DB_FILE
    JWT_SECRET
    JWT_EXPIRES_IN
    SCHEMA

    EMAIL_HOST
    EMAIL_PORT
    EMAIL_USER
    EMAIL_PASS

    S3_BUCKET
    S3_KEY
    S3_SECRET

    IAM_USER
    CONSOLE_SIGN_ING_URL
    IAM_PASSWORD
    ```

4. Start the application:
    ```sh
    # In one terminal
    cd backend && npm start
    # In another terminal
    cd frontend && npm run dev
    ```

The backend API should be available at `http://localhost:<PORT>`, and the frontend UI typically runs at `http://localhost:5371` (or as configured).

---

## Usage

1. Open the frontend in your browser. 
2. Download the .exe file 
3. Run the compatibility check on your workstation.  
4. View detailed results—pass, fail, or recommendations.  
5. The script automatically submit your results for reporting.
6. The system generates a report that can be accessible by the users you setup.


---

## Future Features

- Signup flow (oriented for admins to approve the new signups)
- Roles System (designed for showing certain features depending on the User Role).
- Emailing reports result to the clients.
- Enhancing the UI to be more user-friendly.

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/...`)  
3. Commit your changes (`git commit -m "Add ..."`)  
4. Push to your fork (`git push origin feature/...`)  
5. Open a Pull Request

Please ensure your code adheres to existing style guidelines and includes relevant tests.

---

## License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for more information.

---

## Contact

Maintainer: **Your Name or Alias**  
GitHub: [@MyNameIsJeff-305](https://github.com/MyNameIsJeff-305)  
Feel free to open issues with feedback or suggestions!

---

*(Optional sections you might want to add: architecture diagram, demo screenshots, roadmap, acknowledgments, versioning.)*

Let me know if you'd like to tailor the installation section for a particular framework (like React, Express, or a specific package manager), or include examples such as screenshots. Happy to help customize it further!
::contentReference[oaicite:2]{index=2}
