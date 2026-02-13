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

    // DROPDOWN / MULTIPLE_CHOICE -> option text
    if (field.type === 'DROPDOWN' || field.type === 'MULTIPLE_CHOICE') {
        const resolved = resolveOptionValues(field);
        return resolved ? String(resolved) : null;
    }

    // FILE_UPLOAD -> array of files (handled as images)
    if (field.type === 'FILE_UPLOAD') {
        const files = toArray(field.value).filter(Boolean);
        return files.length ? files : null;
    }

    // arrays -> join
    if (Array.isArray(field.value)) {
        return field.value.length ? field.value : null;
    }

    return field.value != null && field.value !== '' ? String(field.value) : null;
}

/** "Yes"/"No" check (case-insensitive). */
function isYes(value) {
    if (value == null) return false;
    return String(value).trim().toLowerCase() === 'yes';
}

/** Finds the index of the next field (from startIdx) whose label matches label (case-insensitive). */
function indexOfLabel(fields, label, startIdx = 0) {
    const target = String(label).trim().toLowerCase();
    for (let i = startIdx; i < (fields || []).length; i++) {
        const lab = String(fields[i]?.label || '').trim().toLowerCase();
        if (lab === target) return i;
    }
    return -1;
}

/** Finds the index of the next gate question: label starts with "Does the Office have" (case-insensitive). */
function indexOfNextGate(fields, startIdx = 0) {
    for (let i = startIdx; i < (fields || []).length; i++) {
        const lab = String(fields[i]?.label || '').trim().toLowerCase();
        if (lab.startsWith('does the office have')) return i;
    }
    return -1;
}

function getClientNameFromPayload(payload) {
    const fields = payload?.data?.fields || [];
    // Per your rule: fields[0] is Client Name
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
    // rows: [{label, valueHtml}]
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

/** Render FILE_UPLOAD as images (clickable). */
function imageBlockFromFileUpload(files) {
    const fileArr = toArray(files).filter(Boolean);
    if (!fileArr.length) return '';

    return fileArr.map(f => {
        const name = escapeHtml(f.name || 'image');
        const url = escapeHtml(f.url || '');
        return `
      <div style="margin-top:12px;">
        <a href="${url}" target="_blank" rel="noreferrer" style="text-decoration:none;">
          <img src="${url}" alt="${name}" style="max-width:100%; height:auto; border-radius:18px; border:1px solid #FFFFFF2E; display:block;" />
        </a>
      </div>
    `;
    }).join('');
}

function deviceCardHtml(deviceTitle, rows, imagesHtml) {
    return `
    <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A; margin-top:12px;">
      <div style="font-size:14.5pt; font-weight:800; margin:0 0 10px 0;">${escapeHtml(deviceTitle)}</div>
      ${twoColTable(rows)}
      ${imagesHtml || ''}
    </div>
  `;
}

/* ---------------- Extraction: repeated device blocks ---------------- */

/**
 * Extract repeated device groups based on:
 * - gateLabel: "Does the Office have X?"
 * - repeatLabel: "Is there another X?"
 * The device fields are the segment between gate and repeat (per device).
 * Stops when repeat != Yes.
 *
 * It also avoids creating cards for pure-null placeholder segments.
 */
function extractRepeatedGroups(fields, cfg) {
    const gateIdx = indexOfLabel(fields, cfg.gateLabel, 0);
    if (gateIdx === -1) return [];

    const gateVal = normalizeFieldValue(fields[gateIdx]);
    if (!isYes(gateVal)) return [];

    let cursor = gateIdx + 1;
    let deviceNumber = 1;
    const groups = [];

    while (cursor < fields.length) {
        // segment ends at repeatLabel OR next gate question (safety)
        const repeatIdx = indexOfLabel(fields, cfg.repeatLabel, cursor);
        const nextGateIdx = indexOfNextGate(fields, cursor);

        let segmentEnd = -1;
        if (repeatIdx !== -1) segmentEnd = repeatIdx;
        else if (nextGateIdx !== -1) segmentEnd = nextGateIdx;
        else segmentEnd = fields.length;

        // Build values by scanning this segment for expected labels
        const segment = fields.slice(cursor, segmentEnd);

        const rows = [];
        let imagesHtml = '';

        // Optional “name” field used for some devices (e.g., Server Name / Station Name)
        if (cfg.nameLabel) {
            const f = findFieldByLabel(segment, cfg.nameLabel);
            const v = normalizeFieldValue(f);
            if (v) rows.push({ label: cfg.nameLabel, valueHtml: valueAsHtml(v) });
        }

        for (const label of (cfg.tableLabels || [])) {
            const f = findFieldByLabel(segment, label);
            const v = normalizeFieldValue(f);

            // images handled separately
            if (label === cfg.imageLabel) continue;

            if (v != null && String(v).trim() !== '') {
                rows.push({ label, valueHtml: valueAsHtml(v) });
            }
        }

        if (cfg.imageLabel) {
            const imgField = findFieldByLabel(segment, cfg.imageLabel);
            const uploads = normalizeFieldValue(imgField);
            if (uploads && uploads.length) {
                imagesHtml = imageBlockFromFileUpload(uploads);
            }
        }

        // Determine if this device has any actual data (rows or images)
        const hasAny = (rows.length > 0) || Boolean(imagesHtml);

        // If it's purely placeholders (nulls), stop (this matches your “limit 5 but only 2 exist” case)
        if (!hasAny) break;

        const deviceTitle = `${cfg.deviceTitleSingular} ${deviceNumber}`;
        groups.push({ deviceTitle, rows, imagesHtml });

        // Decide whether to continue
        const repeatField = (repeatIdx !== -1 && repeatIdx < fields.length) ? fields[repeatIdx] : null;
        const repeatVal = normalizeFieldValue(repeatField);

        if (repeatIdx !== -1 && isYes(repeatVal)) {
            cursor = repeatIdx + 1;
            deviceNumber += 1;
            continue;
        }

        // If repeat is missing or not yes => stop
        break;
    }

    return groups;
}

/* ---------------- Assessment HTML (FULL) ---------------- */

function buildAssessmentHtml_Full({ title, fields, createdAt, responseId }) {
    let n = 1;
    const parts = [];

    parts.push(headerCard(title, createdAt, responseId));

    // --- SINGLE-VALUE SECTIONS (core) ---
    const hasStaticIpVal = normalizeFieldValue(findFieldByLabel(fields, 'Has Static IP?'));
    const hasStatic = isYes(hasStaticIpVal);

    const generalRows = [
        { label: 'Client Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Client Name'))) },
        { label: 'Client Address', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Client Address'))) },
        { label: 'City', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'City'))) },
        { label: 'State', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'State'))) },
        { label: 'ZIP Code', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'ZIP Code'))) },
    ];

    const contactRows = [
        { label: 'Primary Contact Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Primary Contact Name'))) },
        { label: 'Phone Number', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Phone Number'))) },
        { label: 'Email', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Email'))) },
        { label: 'Location Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Location Name'))) },
    ];

    const mainNetworkRows = [
        { label: 'Internet Service Provider (ISP)', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Internet Service Provider'))) },
        { label: 'Public IP', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Public IP'))) },
        ...(hasStatic ? [{ label: 'Static IP', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Static IP'))) }] : []),
        { label: 'Subnet', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Subnet'))) },
        { label: 'Gateway', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Gateway'))) },
    ];

    parts.push(sectionCard(String(n++), 'General Information', 'Client/site basics', twoColTable(generalRows)));
    parts.push(sectionCard(String(n++), 'Contact Information', 'Primary contact details', twoColTable(contactRows)));
    parts.push(sectionCard(String(n++), 'Main Network Information', 'ISP and addressing', twoColTable(mainNetworkRows)));

    // --- DEVICE SECTIONS (repeated blocks) ---
    const deviceConfigs = [
        {
            sectionTitle: 'Firewalls',
            sectionSubtitle: 'Perimeter security devices',
            gateLabel: 'Does the Office have a Firewall?',
            repeatLabel: 'Is there another Firewall?',
            deviceTitleSingular: 'Firewall',
            tableLabels: ['Brand', 'Model', 'Serial Number', 'Location'],
            imageLabel: 'Upload a picture of the Firewall',
        },
        {
            sectionTitle: 'Servers',
            sectionSubtitle: 'On-prem servers',
            gateLabel: 'Does the Office have Servers?',
            repeatLabel: 'Is there another Server?',
            deviceTitleSingular: 'Server',
            nameLabel: 'Server Name',
            tableLabels: [
                'Brand',
                'Model',
                'User',
                'Password',
                'It was sold and installed by SMART Solutions?',
                'IP Type',
                'IP Address',
                'Tag Number',
                'Serial Number',
                'MAC Address',
                'Operative System (OS)',
                'Location'
            ],
            imageLabel: 'Upload a picture of the server',
        },
        {
            sectionTitle: 'Access Points',
            sectionSubtitle: 'Wireless access points',
            gateLabel: 'Does the Office have Access Points?',
            repeatLabel: 'Is there another Access Point?',
            deviceTitleSingular: 'Access Point',
            tableLabels: ['Brand', 'Model', 'IP Type', 'IP Address', 'Location'],
            imageLabel: 'Upload a picture of the Access Point',
        },
        {
            sectionTitle: 'IP Phones',
            sectionSubtitle: 'VoIP endpoints',
            gateLabel: 'Does the Office have IP Phones?',
            repeatLabel: 'Is there another IP Phone?',
            deviceTitleSingular: 'IP Phone',
            tableLabels: ['Brand', 'Model', 'IP Type', 'IP Address', 'Location'],
            imageLabel: 'Upload a picture of the IP Phone',
        },
        {
            sectionTitle: 'Work Stations (Computers)',
            sectionSubtitle: 'Endpoints used by staff',
            gateLabel: 'Does the Office have Work Stations (Computers)?',
            repeatLabel: 'Is there another Work Station?',
            deviceTitleSingular: 'Work Station',
            nameLabel: 'Station Name',
            tableLabels: [
                'Brand',
                'Model',
                'Form Factor',
                'IP Type',
                'IP Address',
                'Tag Number',
                'Serial Number',
                'MAC Address',
                'Operative System (OS)',
                'Location'
            ],
            imageLabel: 'Upload a picture of the Station',
        },
        {
            sectionTitle: 'Network Switches',
            sectionSubtitle: 'Switching infrastructure',
            gateLabel: 'Does the Office have Network Switches?',
            repeatLabel: 'Is there another Network Switch?',
            deviceTitleSingular: 'Network Switch',
            tableLabels: ['Brand', 'Model', 'Managed Switch?', 'Amount of Ports', 'Location'],
            imageLabel: 'Upload a picture of the Network Switch',
        },
        {
            sectionTitle: 'Printers',
            sectionSubtitle: 'Printing devices',
            gateLabel: 'Does the Office have Printers?',
            repeatLabel: 'Is there another Printer?',
            deviceTitleSingular: 'Printer',
            tableLabels: [
                'Brand',
                'Model',
                'Printer Type',
                'Cartridge Model',
                'Toner Model',
                'Ink Type',
                'Printer Connection',
                'IP Type',
                'IP Address',
                'Location'
            ],
            imageLabel: 'Upload a picture of the Printer',
        },
        {
            sectionTitle: 'Scanners',
            sectionSubtitle: 'Scanning devices',
            gateLabel: 'Does the Office have Scanners?',
            repeatLabel: 'Is there another Scanner?',
            deviceTitleSingular: 'Scanner',
            tableLabels: ['Brand', 'Model', 'Scanner Connection', 'IP Type', 'IP Address', 'Location'],
            imageLabel: 'Upload a picture of the Scanner',
        },
        {
            sectionTitle: 'NAS Stations',
            sectionSubtitle: 'Network-attached storage devices',
            gateLabel: 'Does the Office have NAS Stations?',
            repeatLabel: 'Is there another NAS Station?',
            deviceTitleSingular: 'NAS Station',
            tableLabels: ['Brand', 'Model', 'Serial Number', 'Location'],
            imageLabel: 'Upload a picture of the NAS Station',
        },
        {
            sectionTitle: 'Payment Terminals',
            sectionSubtitle: 'Point-of-sale / payment devices',
            gateLabel: 'Does the Office have Payment Terminals?',
            repeatLabel: 'Is there another Payment Terminal?',
            deviceTitleSingular: 'Payment Terminal',
            tableLabels: ['Brand', 'Model', 'IP Type', 'IP Address', 'Location'],
            imageLabel: 'Upload a picture of the Payment Terminal',
        },
        {
            sectionTitle: 'CCTV Systems',
            sectionSubtitle: 'Security camera systems',
            gateLabel: 'Does the Office have CCTV Systems?',
            repeatLabel: 'Is there another CCTV System?',
            deviceTitleSingular: 'CCTV System',
            tableLabels: ['Type', 'Brand', 'Model', 'Amount of Cameras', 'Location'],
            imageLabel: 'Upload a picture of the CCTV System',
        },
        {
            sectionTitle: 'Dental Management Software',
            sectionSubtitle: 'Practice management applications',
            gateLabel: 'Does the Office have Dental Management Software?',
            repeatLabel: 'Is there another Dental Management Software?',
            deviceTitleSingular: 'Dental Management Software',
            tableLabels: ['Name', 'Server Name', 'IP Type', 'IP Address'],
            imageLabel: null,
        },
        {
            sectionTitle: 'Imaging Software',
            sectionSubtitle: 'Radiology / imaging applications',
            gateLabel: 'Does the Office have Imaging Software?',
            repeatLabel: 'Is there another Imaging Software?',
            deviceTitleSingular: 'Imaging Software',
            tableLabels: ['Name', 'Server Name', 'IP Type', 'IP Address'],
            imageLabel: null,
        },
    ];

    for (const cfg of deviceConfigs) {
        const groups = extractRepeatedGroups(fields, cfg);
        if (!groups.length) continue;

        const cardsHtml = groups
            .map(g => deviceCardHtml(g.deviceTitle, g.rows, g.imagesHtml))
            .join('');

        parts.push(
            sectionCard(
                String(n++),
                cfg.sectionTitle,
                cfg.sectionSubtitle || '',
                cardsHtml
            )
        );
    }

    return wrapper(parts.join(''));
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
