const express = require('express');
const router = express.Router();
const axios = require('axios');

const { FRESHSERVICE_API_KEY, FRESHSERVICE_DOMAIN } = process.env;

if (!FRESHSERVICE_API_KEY || !FRESHSERVICE_DOMAIN) {
    throw new Error('FRESHSERVICE_API_KEY or FRESHSERVICE_DOMAIN is not set in environment variables.');
}

// Freshservice target
const FOLDER_ID = 39000023200;
const DRAFT_STATUS = 1; // 1 = Draft, 2 = Published

const fsApi = axios.create({
    baseURL: `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2`,
    auth: { username: FRESHSERVICE_API_KEY, password: 'X' },
    headers: { 'Content-Type': 'application/json' }
});

/* ---------------- Helpers ---------------- */

function escapeHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function toArray(v) {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
}

/** Find a field by label (exact match; case-insensitive). */
function findFieldByLabel(fields, label) {
    const target = String(label).trim().toLowerCase();
    return (fields || []).find(f => String(f?.label || '').trim().toLowerCase() === target) || null;
}

function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find a field by label for a specific group index (supports common suffix patterns). */
function findFieldByLabelIndexed(fields, baseLabel, index, deviceNameForPattern) {
    const base = String(baseLabel).trim();
    const i = Number(index);
    const dev = deviceNameForPattern ? String(deviceNameForPattern).trim().toLowerCase() : null;

    // Works with:
    // "Brand (2)", "Brand 2", "Brand #2", "Brand - 2", "Brand (Firewall 2)"
    // "Switch 2 Brand", "Access Point 3 Model", etc.
    const patterns = [
        new RegExp(`^${escapeRegExp(base)}\\s*\\(${i}\\)$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s+${i}$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s*#\\s*${i}$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s*[-–—]\\s*${i}$`, 'i'),
        dev ? new RegExp(`^${escapeRegExp(base)}\\s*\\(\\s*${escapeRegExp(dev)}\\s*${i}\\s*\\)$`, 'i') : null,
        dev ? new RegExp(`^${escapeRegExp(dev)}\\s*${i}\\s+${escapeRegExp(base)}$`, 'i') : null,
        dev ? new RegExp(`^${escapeRegExp(dev)}\\s*#?\\s*${i}\\s*[-–—:]?\\s*${escapeRegExp(base)}$`, 'i') : null,
    ].filter(Boolean);

    return (fields || []).find(f => {
        const lab = String(f?.label || '').trim();
        return patterns.some(re => re.test(lab));
    }) || null;
}

/** Resolve option IDs to option text for DROPDOWN/MULTIPLE_CHOICE. */
function resolveOptionValues(field) {
    const selectedIds = toArray(field?.value).filter(Boolean);
    const options = toArray(field?.options);

    if (!selectedIds.length) return null;

    if (options.length) {
        const idToText = new Map(options.map(o => [o.id, o.text]));
        const texts = selectedIds.map(id => idToText.get(id) || id);
        return texts.join(', ');
    }
    return selectedIds.join(', ');
}

function normalizeFieldValue(field) {
    if (!field) return null;

    if (field.type === 'DROPDOWN' || field.type === 'MULTIPLE_CHOICE') {
        const resolved = resolveOptionValues(field);
        return resolved ? String(resolved) : null;
    }

    if (field.type === 'FILE_UPLOAD') {
        const files = toArray(field.value).filter(Boolean);
        return files.length ? files : null;
    }

    if (Array.isArray(field.value)) {
        return field.value.length ? field.value : null;
    }

    return field.value != null && field.value !== '' ? String(field.value) : null;
}

/** "Yes"/"No" check for dropdowns */
function isYes(value) {
    if (value == null) return false;
    return String(value).trim().toLowerCase() === 'yes';
}

function getClientNameFromPayload(payload) {
    const fields = payload?.data?.fields || [];
    return (fields && fields[0] && fields[0].value) ? String(fields[0].value) : 'Unknown Client';
}

/* ---------------- HTML builders (reference style) ---------------- */

function wrapper(html) {
    return `<div style="font-family:Arial, Helvetica, sans-serif; font-size:12pt; line-height:1.5; color:inherit;">${html}</div>`;
}

function headerCard(title, createdAt, responseId) {
    return `
    <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:16px; background:#FFFFFF0A;">
      <div style="font-size:18pt; font-weight:800; margin:0 0 4px 0;">${escapeHtml(title)}</div>
      <div style="opacity:.85;">Network assessment captured via Tally webhook and exported to Freshservice.</div>
      <div style="margin-top:12px; border-left:4px solid #FFFFFF59; padding:10px 12px; border-radius:12px; background:#FFFFFF0D;">
        <strong>Captured:</strong> ${escapeHtml(createdAt || 'N/A')}
        <br><strong>Response ID:</strong> ${escapeHtml(responseId || 'N/A')}
        <br><strong>Status:</strong> Draft
      </div>
    </div>
  `;
}

function sectionCard(number, title, subtitle, innerHtml) {
    return `
    <div style="margin-top:14px; border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A;">
      <table style="width:100%;">
        <tbody>
          <tr>
            <td style="width:58px;">
              <span style="display:inline-block; min-width:40px; height:40px; line-height:40px; padding:0 12px; border-radius:999px; background:#2B7BBB; color:#FFFFFF; font-weight:800;">${escapeHtml(number)}</span>
            </td>
            <td>
              <div style="font-size:16pt; font-weight:800;">${escapeHtml(title)}</div>
              ${subtitle ? `<div style="opacity:.85;">${escapeHtml(subtitle)}</div>` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:12px; border-left:4px solid #FFFFFF59; padding:10px 12px; border-radius:12px; background:#FFFFFF0D;">
        ${innerHtml}
      </div>
    </div>
  `;
}

function twoColTable(rows) {
    const body = rows
        .filter(r => r && r.valueHtml != null && String(r.valueHtml).trim() !== '')
        .map(r => `
      <tr>
        <td style="width:38%; padding:10px 10px; border-bottom:1px solid #FFFFFF2E; font-weight:800; vertical-align:top;">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:10px 10px; border-bottom:1px solid #FFFFFF2E; vertical-align:top;">
          ${r.valueHtml}
        </td>
      </tr>
    `)
        .join('');

    return `
    <table style="width:100%; border-collapse:collapse;">
      <tbody>
        ${body || `<tr><td style="padding:10px; opacity:.85;">No data provided.</td></tr>`}
      </tbody>
    </table>
  `;
}

function valueAsHtml(val) {
    if (val == null) return '';
    return escapeHtml(String(val));
}

function imageBlockFromFileUpload(files) {
    const fileArr = toArray(files).filter(Boolean);
    if (!fileArr.length) return '';

    return fileArr.map(f => {
        const name = escapeHtml(f.name || 'image');
        const url = escapeHtml(f.url || '');
        return `
      <div style="margin-top:12px;">
        <div style="font-weight:800; margin-bottom:6px; opacity:.9;">${name}</div>
        <a href="${url}" target="_blank" rel="noreferrer">
          <img src="${url}" alt="${name}" style="max-width:100%; height:auto; border-radius:18px; border:1px solid #FFFFFF2E; display:block;" />
        </a>
      </div>
    `;
    }).join('');
}

/* ---------------- Generic device section builder ---------------- */

function buildDeviceSection({
    number,
    sectionTitle,
    sectionSubtitle,
    fields,
    deviceKeyName, // used in label matching patterns (e.g., "firewall", "switch", "access point")
    gateLabel,     // e.g., "Does the Office have a Firewall?"
    gateYesRequired = true,
    baseLabels,    // ordered list of base labels to include per device
    imageLabel,    // optional label for file upload per device
    maxDevices = 10
}) {
    // Gate (optional)
    if (gateLabel) {
        const gateVal = normalizeFieldValue(findFieldByLabel(fields, gateLabel));
        const gatedOk = gateYesRequired ? isYes(gateVal) : !isYes(gateVal);
        if (!gatedOk) return null;
    }

    const cards = [];

    for (let i = 1; i <= maxDevices; i++) {
        const rows = [];

        // For each base label, try first unsuffixed (for i=1), then indexed
        for (const baseLabel of baseLabels) {
            const fieldObj = i === 1
                ? (findFieldByLabel(fields, baseLabel) || findFieldByLabelIndexed(fields, baseLabel, 1, deviceKeyName))
                : findFieldByLabelIndexed(fields, baseLabel, i, deviceKeyName);

            const val = normalizeFieldValue(fieldObj);
            if (val == null) continue;

            // FILE_UPLOAD should not go into the table here (we handle images separately)
            if (Array.isArray(val) && fieldObj?.type === 'FILE_UPLOAD') continue;

            rows.push({ label: baseLabel, valueHtml: valueAsHtml(val) });
        }

        const uploadObj = imageLabel
            ? (i === 1
                ? (findFieldByLabel(fields, imageLabel) || findFieldByLabelIndexed(fields, imageLabel, 1, deviceKeyName))
                : findFieldByLabelIndexed(fields, imageLabel, i, deviceKeyName))
            : null;

        const uploads = uploadObj ? normalizeFieldValue(uploadObj) : null;
        const imagesHtml = uploads ? imageBlockFromFileUpload(uploads) : '';

        const hasAny = rows.length > 0 || Boolean(imagesHtml);
        if (!hasAny) {
            if (i === 1) {
                cards.push(`
          <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A; margin-top:12px;">
            <div style="font-size:16pt; font-weight:800; margin:0 0 6px 0;">${escapeHtml(sectionTitle)} 1</div>
            <div style="opacity:.85;">No ${escapeHtml(sectionTitle.toLowerCase())} details provided.</div>
          </div>
        `);
            }
            break;
        }

        const deviceTable = twoColTable(rows);

        cards.push(`
      <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A; margin-top:12px;">
        <div style="font-size:14.5pt; font-weight:800; margin:0 0 10px 0;">${escapeHtml(sectionTitle)} ${i}</div>
        ${deviceTable}
        ${imagesHtml}
      </div>
    `);
    }

    return sectionCard(
        String(number),
        sectionTitle + 's',
        sectionSubtitle,
        cards.join('') || `<div style="opacity:.85;">No details provided.</div>`
    );
}

/* ---------------- Assessment HTML (FULL) ---------------- */

function buildAssessmentHtml_Full({ title, fields, createdAt, responseId }) {
    let n = 1;

    // General Information
    const generalRows = [
        { label: 'Client Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Client Name'))) },
        { label: 'Client Address', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Client Address'))) },
        { label: 'City', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'City'))) },
        { label: 'State', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'State'))) },
        { label: 'ZIP Code', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'ZIP Code'))) },
    ];

    // Contact Information
    const contactRows = [
        { label: 'Primary Contact Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Primary Contact Name'))) },
        { label: 'Phone Number', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Phone Number'))) },
        { label: 'Email', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Email'))) },
        { label: 'Location Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Location Name'))) },
    ];

    // Main Network Information (+ conditional Static IP)
    const hasStaticIpVal = normalizeFieldValue(findFieldByLabel(fields, 'Has Static IP?'));
    const hasStatic = isYes(hasStaticIpVal);

    const mainNetworkRows = [
        { label: 'Internet Service Provider (ISP)', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Internet Service Provider'))) },
        { label: 'Public IP', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Public IP'))) },
        ...(hasStatic ? [{ label: 'Static IP', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Static IP'))) }] : []),
        { label: 'Subnet', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Subnet'))) },
        { label: 'Gateway', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Gateway'))) },
    ];

    const htmlParts = [];
    htmlParts.push(headerCard(title, createdAt, responseId));

    htmlParts.push(sectionCard(String(n++), 'General Information', 'Client/site basics', twoColTable(generalRows)));
    htmlParts.push(sectionCard(String(n++), 'Contact Information', 'Primary contact details', twoColTable(contactRows)));
    htmlParts.push(sectionCard(String(n++), 'Main Network Information', 'ISP and addressing', twoColTable(mainNetworkRows)));

    // Firewalls (gated)
    const firewallsSection = buildDeviceSection({
        number: n++,
        sectionTitle: 'Firewall',
        sectionSubtitle: 'Firewall devices included in this assessment',
        fields,
        deviceKeyName: 'firewall',
        gateLabel: 'Does the Office have a Firewall?',
        baseLabels: ['Brand', 'Model', 'Serial Number', 'Location'],
        imageLabel: 'Upload a picture of the Firewall',
        maxDevices: 10
    });
    if (firewallsSection) htmlParts.push(firewallsSection);

    // Switches (example gate label — adjust if your form uses a different label)
    const switchesSection = buildDeviceSection({
        number: n++,
        sectionTitle: 'Switch',
        sectionSubtitle: 'Switch devices included in this assessment',
        fields,
        deviceKeyName: 'switch',
        gateLabel: 'Does the Office have a Switch?', // <-- rename if needed
        baseLabels: ['Brand', 'Model', 'Serial Number', 'Location'],
        imageLabel: 'Upload a picture of the Switch', // <-- rename if needed
        maxDevices: 10
    });
    if (switchesSection) htmlParts.push(switchesSection);

    // Access Points (example gate label — adjust if your form uses a different label)
    const apsSection = buildDeviceSection({
        number: n++,
        sectionTitle: 'Access Point',
        sectionSubtitle: 'Wireless access points included in this assessment',
        fields,
        deviceKeyName: 'access point',
        gateLabel: 'Does the Office have Access Points?', // <-- rename if needed
        baseLabels: ['Brand', 'Model', 'Serial Number', 'Location'],
        imageLabel: 'Upload a picture of the Access Point', // <-- rename if needed
        maxDevices: 20
    });
    if (apsSection) htmlParts.push(apsSection);

    // Stations (example gate label — adjust if your form uses a different label)
    const stationsSection = buildDeviceSection({
        number: n++,
        sectionTitle: 'Station',
        sectionSubtitle: 'Workstations / endpoints included in this assessment',
        fields,
        deviceKeyName: 'station',
        gateLabel: 'Do you have Stations?', // <-- rename if needed
        baseLabels: ['Brand', 'Model', 'Serial Number', 'Location'],
        imageLabel: 'Upload a picture of the Station', // <-- rename if needed
        maxDevices: 50
    });
    if (stationsSection) htmlParts.push(stationsSection);

    return wrapper(htmlParts.join(''));
}

/* ---------------- Route ---------------- */

router.post('/export-to-freshservice', async (req, res) => {
    try {
        const payload = req.body;
        const fields = payload?.data?.fields || [];

        const clientName = getClientNameFromPayload(payload);
        const articleTitle = `Network Assessment ${clientName}`;

        const descriptionHtml = buildAssessmentHtml_Full({
            title: articleTitle,
            fields,
            createdAt: payload?.createdAt || payload?.data?.createdAt,
            responseId: payload?.data?.responseId
        });

        const tags = [String(clientName).trim(), 'Network Assessment'].filter(Boolean);

        const createResp = await fsApi.post('/solutions/articles', {
            title: articleTitle,
            description: descriptionHtml,
            status: DRAFT_STATUS,
            folder_id: FOLDER_ID,
            tags
        });

        return res.status(201).json({
            message: 'Draft Knowledge Base article created in Freshservice.',
            article: createResp.data
        });
    } catch (err) {
        const status = err?.response?.status || 500;
        const data = err?.response?.data || { message: err.message };
        console.error('Freshservice create article failed:', status, data);

        return res.status(status).json({
            message: 'Failed to create Freshservice article.',
            details: data
        });
    }
});

module.exports = router;
