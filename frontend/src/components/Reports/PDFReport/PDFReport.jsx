/* eslint-disable react/no-unescaped-entities */
import {
    Document,
    Page,
    Image,
    Text,
    View,
    StyleSheet,
    Font
} from '@react-pdf/renderer';

// Optional: Added a custom font
Font.register({
    family: 'Helvetica-Bold',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v14/YkM2Z0-ZY1e_wjl2uD7DLhlHkXKqQlPDPs1TW7lplhE.ttf' },
    ],
});

//Background image
const backgroundImage = 'https://win11comptool.s3.us-east-1.amazonaws.com/watermark-pdf.jpg';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        bottom: 0,
        right: 0,
        zIndex: -1
    },
    titleHeader: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between"
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        marginBottom: 10,
        paddingTop: 150,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'left',
        paddingTop: 20,
        textTransform: 'uppercase',
    },
    bulletpoint: {
        fontSize: 10,
        marginBottom: 5,
        paddingLeft: 10,
        textAlign: 'justify',
        lineHeight: 1.5,
        fontFamily: 'Helvetica',
    },
    paragraph: {
        marginBottom: 10,
        textAlign: 'justify',
        lineHeight: 1.5,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    paragraphBold: {
        marginBottom: 10,
        textAlign: 'justify',
        lineHeight: 1.5,
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e40613',
        color: 'white',
        fontWeight: 'bold',
        padding: 5,
        borderBottom: '1pt solid #eee',
    },
    row: {
        flexDirection: 'row',
        borderBottom: '1pt solid #eee',
        padding: 5,
    },
    cell: {
        flex: 1,
        paddingHorizontal: 2,
    },
    yes: { color: 'green', fontWeight: 'bold' },
    no: { color: 'red', fontWeight: 'bold' },
    yesHeading: { color: "green", fontWeight: "bold", borderBottom: "3pt solid green"},
    noHeading: { color: "red", fontWeight: "bold", borderBottom: "3pt solid red"}
});

const ReportsPDF = ({ r }) => (
    <Document>
        <Page size='LETTER' style={styles.page}>
            <View style={styles.titleHeader}>
                <Text style={styles.title}>System Compatibility Report</Text>
                <Text style={[styles.title, r.compatible === "Yes" ? styles.yesHeading : styles.noHeading]}>{r.compatible === "Yes" ? 'Compatible' : 'Incompatible'}</Text>
            </View>
            <Text style={styles.subtitle}>About this Report</Text>
            <Text style={styles.paragraph}>
                This report provides a simple overview of your computer's compatibility with the Windows 11 operating system. It helps you understand whether your device is ready for the upgrade or if certain updates or changes may be needed.
            </Text>
            <Image src={backgroundImage} style={styles.backgroundImage} />
            {/* Table Header */}
            <View style={styles.tableHeader}>
                <Text style={[styles.cell, { flex: 1.2 }]}>Machine Code</Text>
                <Text style={[styles.cell, { flex: 1 }]}>Client</Text>
                <Text style={[styles.cell, { flex: 0.8 }]}>Public IP</Text>
                <Text style={[styles.cell, { flex: 0.8 }]}>Compatible</Text>
            </View>

            {/* Table Rows */}

            <View style={styles.row}>
                <Text style={[styles.cell, { flex: 1.2 }]}>{r.machineCode}</Text>
                <Text style={[styles.cell, { flex: 1 }]}>{r.client}</Text>
                <Text style={[styles.cell, { flex: 0.8 }]}>{r.publicIP}</Text>
                <Text
                    style={[
                        styles.cell,
                        { flex: 0.8 },
                        r.compatible === 'Yes' ? styles.yes : styles.no,
                    ]}
                >
                    {r.compatible}
                </Text>
            </View>

            <Text style={styles.subtitle}>System Specifications</Text>

            <View style={styles.tableHeader}>
                <Text style={styles.cell}>CPU</Text>
                <Text style={styles.cell}>RAM</Text>
                <Text style={styles.cell}>Storage</Text>
                <Text style={styles.cell}>TPM</Text>
                <Text style={styles.cell}>Secure Boot</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.cell}>{r.cpu}</Text>
                <Text style={styles.cell}>{r.ram}</Text>
                <Text style={styles.cell}>{r.storage}</Text>
                <Text style={styles.cell}>{r.tpm}</Text>
                <Text style={styles.cell}>{r.secureBoot}</Text>
            </View>

            <Text style={styles.subtitle}>Issues Found</Text>
            <View>
                {r.issues ? (
                    <Text style={styles.paragraphBold}>{r.issues}</Text>
                ) : (
                    <Text style={styles.paragraphBold}>No issues found. Your system meets all the requirements for Windows 11.</Text>
                )}
            </View>

            <Text style={styles.subtitle}>How We Check Compatibility</Text>
            <Text style={styles.paragraph}>
                To determine if your computer can run Windows 11, we check the following key areas:<br />
            </Text>
            <Text style={styles.bulletpoint}>
                • Processor (CPU): We verify if your computer's brain is powerful and modern enough for Windows 11.<br />
            </Text>
            <Text style={styles.bulletpoint}>
                • Memory (RAM): We check that your device has enough memory to handle new features smoothly.<br />
            </Text>
            <Text style={styles.bulletpoint}>
                • Storage: We make sure there’s enough space to install and run Windows 11.<br />
            </Text>
            <Text style={styles.bulletpoint}>
                • Security Features: We look at important safety features like TPM (Trusted Platform Module) and Secure Boot to ensure your system is secure and up-to-date.
            </Text>
            <Text style={styles.paragraph}></Text>
            <Text style={styles.paragraph}>
                Each of these checks is based on Microsoft’s official requirements for Windows 11. If your computer meets all the requirements, it is considered "Compatible." If one or more items don’t meet the criteria, your system will be marked as "Not Compatible", along with the reasons why.
            </Text>
        </Page>
    </Document>
);

export default ReportsPDF;
