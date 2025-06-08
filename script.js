// Constants
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpLow9FVw-ZnRVpaFBshp5ZbMsEH_SnnHhMmOY8UBSToJowRYhXx8_0HRs2kfFy4tJ/exec';
const CURRENT_SL_TIME = '2025-02-18 01:57:45';
const USER_LOGIN = 'Ashen1217';

// ... (Other functions like formatSriLankaDateTime, calculateAge etc. remain unchanged) ...
// Format Sri Lanka date and time
function formatSriLankaDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

// Get submission date time
function getSubmissionDateTime() {
    return CURRENT_SL_TIME;
}

// Validate name format
function validateNameFormat(name) {
    return /^[A-Z]+(?:\s[A-Z]+)*$/.test(name);
}

// Calculate age from date of birth
function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const m = today.getUTCMonth() - birthDate.getUTCMonth();
    
    if (m < 0 || (m === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
        age--;
    }
    return age;
}

// Calculate passport expiry date
function calculateExpiry(issueDate) {
    const date = new Date(issueDate);
    date.setUTCFullYear(date.getUTCFullYear() + 10);
    return date.toISOString().split('T')[0];
}

// Check for duplicate passport
async function checkDuplicatePassport(passportNumber) {
    try {
        const response = await fetch(
            `${SCRIPT_URL}?action=checkDuplicate&passportNumber=${encodeURIComponent(passportNumber)}`,
            { method: 'GET', mode: 'cors' }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return result.isDuplicate;
    } catch (error) {
        console.error('Error checking duplicate passport:', error);
        throw new Error('Failed to check for duplicate passport number');
    }
}

// Search companies with debounce
let searchDebounceTimer;
async function searchCompanies(searchTerm) {
    const searchResultsDiv = document.getElementById('searchResults');
    if (!searchTerm.trim()) {
        searchResultsDiv.innerHTML = '';
        return;
    }
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        try {
            searchResultsDiv.innerHTML = '<div class="p-2">Searching...</div>';
            const response = await fetch(`${SCRIPT_URL}?action=searchCompanies&term=${encodeURIComponent(searchTerm)}`, { method: 'GET', mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const companies = await response.json();
            searchResultsDiv.innerHTML = '';
            if (!Array.isArray(companies) || companies.length === 0) {
                searchResultsDiv.innerHTML = '<div class="p-2">No matching companies found</div>';
                return;
            }
            companies.forEach(company => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.innerHTML = `<div class="company-name">${company[0]}</div><div class="company-details"><span class="customer-code">${company[1]}</span></div>`;
                resultItem.addEventListener('click', () => {
                    document.getElementById('companySearch').value = company[0];
                    document.getElementById('customerCode').value = company[1];
                    document.getElementById('town').value = company[2] || '';
                    document.getElementById('district').value = company[3] || '';
                    searchResultsDiv.innerHTML = '';
                    ['companySearch', 'customerCode', 'town', 'district'].forEach(id => document.getElementById(`${id}Error`).textContent = '');
                });
                searchResultsDiv.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching companies:', error);
            searchResultsDiv.innerHTML = '<div class="p-2 text-red-500">Error fetching results.</div>';
        }
    }, 300);
}

// Validate field function remains the same
function validateField(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    if (!field || !errorDiv) return true;
    let isValid = true;
    let errorMessage = '';
    field.classList.remove('error');
    errorDiv.textContent = '';
    switch (fieldId) {
        case 'participantName':
        case 'surname':
            if (field.value.trim() === '') {
                isValid = false;
                errorMessage = `${fieldId === 'participantName' ? 'Full Name' : 'Surname'} is required`;
            } else if (!validateNameFormat(field.value.trim())) {
                isValid = false;
                errorMessage = 'Only uppercase letters (A-Z) and single spaces are allowed';
            }
            break;
        case 'mobileNumber':
            isValid = /^07[0-9]{8}$/.test(field.value.replace(/\s/g, ''));
            errorMessage = 'Invalid mobile number format (07XXXXXXXX)';
            break;
        case 'passportNumber':
            isValid = /^[A-Z][0-9]{7,9}$/.test(field.value);
            errorMessage = 'Invalid passport format (e.g., N1234567)';
            break;
        default:
            isValid = field.value.trim() !== '';
            errorMessage = `This field is required`;
    }
    if (!isValid) {
        field.classList.add('error');
        errorDiv.textContent = errorMessage;
    }
    return isValid;
}

function validateAndScrollToFirstError() {
    const fieldOrder = ['companySearch', 'customerCode', 'town', 'district', 'participantName', 'surname', 'dateOfBirth', 'mobileNumber', 'gender', 'relationshipStatus', 'passportNumber', 'issueDate', 'expiryDate', 'tshirtSize', 'mealPreference', 'additionalParticipants'];
    for (const fieldId of fieldOrder) {
        let isValid = true;
        let elementToScroll;
        if (['gender', 'mealPreference', 'additionalParticipants'].includes(fieldId)) {
            const checked = document.querySelector(`input[name="${fieldId}"]:checked`);
            if (!checked) {
                isValid = false;
                document.getElementById(`${fieldId}Error`).textContent = 'Please select an option';
                elementToScroll = document.querySelector(`input[name="${fieldId}"]`).parentElement;
            } else {
                document.getElementById(`${fieldId}Error`).textContent = '';
            }
        } else {
            isValid = validateField(fieldId);
            if (!isValid) {
                elementToScroll = document.getElementById(fieldId);
            }
        }
        if (!isValid) {
            gsap.to(window, { duration: 0.8, scrollTo: { y: elementToScroll, offsetY: 100 }, ease: 'power2.inOut' });
            return false;
        }
    }
    return true;
}

// =============================================================
// === MODIFIED showSuccessMessage Function with QR Generation ===
// =============================================================
function showSuccessMessage(submittedData) {
    const thankYouMessage = document.getElementById('thankYouMessage');
    const formInputs = document.getElementById('formInputs');
    
    // Hide form and show success message
    formInputs.style.display = 'none';
    thankYouMessage.classList.remove('hidden');

    // Display QR Code data (Passport Number)
    const qrDataDisplay = document.getElementById('qr-data-display');
    qrDataDisplay.textContent = `Passport: ${submittedData.passportNumber}`;

    // --- QR Code Generation Logic ---
    const qrCode = new QRCodeStyling({
        width: 220,
        height: 220,
        type: 'svg',
        data: submittedData.passportNumber, // Using Passport Number for the QR Code
        dotsOptions: {
            color: '#2563eb', // A nice blue color
            type: 'rounded'
        },
        backgroundOptions: {
            color: '#ffffff',
        },
        cornersSquareOptions: {
            type: 'extra-rounded',
            color: '#3b82f6'
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 5
        }
    });

    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = ''; // Clear previous QR if any
    qrCode.append(qrContainer);

    // Setup download button
    const downloadBtn = document.getElementById('download-qr-btn');
    downloadBtn.onclick = () => {
        qrCode.download({ name: `${submittedData.participantName}-QR-Pass`, extension: 'png' });
    };
    
    // Scroll to top
    gsap.to(window, { duration: 0.8, scrollTo: { y: 0 }, ease: 'power2.inOut' });
}


function showLoadingState(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (show) {
        loadingOverlay.classList.remove('hidden');
        gsap.to(loadingOverlay, { opacity: 1, duration: 0.3 });
    } else {
        gsap.to(loadingOverlay, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => loadingOverlay.classList.add('hidden')
        });
    }
}


// ======================================================
// === MODIFIED handleSubmit Function to pass data      ===
// ======================================================
async function handleSubmit(event) {
    event.preventDefault();
    if (!validateAndScrollToFirstError()) return;

    showLoadingState(true);

    try {
        const form = document.getElementById('participantForm');
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        // Add submission metadata
        data.submissionDateTime = formatSriLankaDateTime();

        const response = await fetch(`${SCRIPT_URL}?data=${encodeURIComponent(JSON.stringify(data))}`, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result.result === 'success') {
            // PASS THE SUBMITTED DATA to the success function
            showSuccessMessage(data); 
        } else {
            alert(`Submission Failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Error submitting form. Please try again or contact support.');
    } finally {
        showLoadingState(false);
    }
}

function resetForm() {
    const form = document.getElementById('participantForm');
    const formInputs = document.getElementById('formInputs');
    const thankYouMessage = document.getElementById('thankYouMessage');
    
    form.reset();
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    
    gsap.to(thankYouMessage, {
        opacity: 0, duration: 0.3,
        onComplete: () => {
            thankYouMessage.classList.add('hidden');
            formInputs.style.display = 'block';
            gsap.from(formInputs, { opacity: 0, y: 20, duration: 0.5 });
        }
    });
    
    gsap.to(window, { duration: 0.8, scrollTo: { y: 0 }, ease: 'power2.inOut' });
}


function initializeFormListeners() {
    // All other listeners remain the same
    document.getElementById('companySearch').addEventListener('input', (e) => searchCompanies(e.target.value));
    document.getElementById('dateOfBirth').addEventListener('change', function() { document.getElementById('age').value = calculateAge(this.value); });
    document.getElementById('issueDate').addEventListener('change', function() { document.getElementById('expiryDate').value = calculateExpiry(this.value); });
    document.getElementById('participantForm').addEventListener('submit', handleSubmit);
    document.addEventListener('click', function(event) {
        const searchResults = document.getElementById('searchResults');
        const companySearch = document.getElementById('companySearch');
        if (searchResults && companySearch && !companySearch.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.innerHTML = '';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    AOS.init({ duration: 800, once: true, offset: 100 });
    initializeFormListeners();
    // Time update logic remains the same
    const timeElem = document.getElementById('currentDateTime');
    if (timeElem) {
        setInterval(() => { timeElem.textContent = formatSriLankaDateTime() }, 1000);
    }
});
