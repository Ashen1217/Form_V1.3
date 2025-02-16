// Constants
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3QZqobXTDFbi2WUc28DLrhVQoZ2JVTfsXOKkteNCk_Wh5DjFhnfPzeEQ0d9ZPnQvZ/exec';

// Format date and time in Sri Lanka time zone
function formatSriLankaDateTime() {
    const now = new Date();
    const sriLankaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
    
    const year = sriLankaTime.getFullYear();
    const month = String(sriLankaTime.getMonth() + 1).padStart(2, '0');
    const day = String(sriLankaTime.getDate()).padStart(2, '0');
    const hours = String(sriLankaTime.getHours()).padStart(2, '0');
    const minutes = String(sriLankaTime.getMinutes()).padStart(2, '0');
    const seconds = String(sriLankaTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get submission date time
function getSubmissionDateTime() {
    return formatSriLankaDateTime();
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
    const companySearchInput = document.getElementById('companySearch');
    const customerCodeInput = document.getElementById('customerCode');
    const townInput = document.getElementById('town');
    const districtInput = document.getElementById('district');

    // Clear and hide results if search term is empty
    if (!searchTerm.trim()) {
        searchResultsDiv.innerHTML = '';
        searchResultsDiv.style.display = 'none';
        return;
    }

    // Clear previous timer
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(async () => {
        try {
            searchResultsDiv.innerHTML = '<div class="search-loading">Searching...</div>';
            searchResultsDiv.style.display = 'block';

            const response = await fetch(
                `${SCRIPT_URL}?action=searchCompanies&term=${encodeURIComponent(searchTerm)}`,
                { method: 'GET', mode: 'cors' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const companies = await response.json();
            searchResultsDiv.innerHTML = '';

            if (!Array.isArray(companies) || companies.length === 0) {
                searchResultsDiv.innerHTML = '<div class="search-no-results">No matching companies found</div>';
                return;
            }

            companies.forEach(company => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.innerHTML = `
                    <div class="company-name">${company[0]}</div>
                    <div class="company-details">
                        <span class="customer-code">${company[1]}</span>
                        ${company[2] ? ` • ${company[2]}` : ''}
                        ${company[3] ? ` • ${company[3]}` : ''}
                    </div>
                `;

                resultItem.addEventListener('click', () => {
                    companySearchInput.value = company[0];
                    customerCodeInput.value = company[1];
                    townInput.value = company[2] || '';
                    districtInput.value = company[3] || '';
                    searchResultsDiv.style.display = 'none';
                    validateField('companySearch');
                });

                searchResultsDiv.appendChild(resultItem);
            });

            searchResultsDiv.style.display = 'block';

        } catch (error) {
            console.error('Error fetching companies:', error);
            searchResultsDiv.innerHTML = '<div class="search-error">Error fetching results. Please try again.</div>';
        }
    }, 300);
}

// Validate field
function validateField(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    
    if (!field || !errorDiv) return true;

    let isValid = true;
    let errorMessage = '';

    field.classList.remove('error');
    errorDiv.textContent = '';

    switch(fieldId) {
        case 'companySearch':
            isValid = field.value.trim() !== '';
            errorMessage = 'Please select a company';
            break;

        case 'mobileNumber':
            isValid = /^07[0-9]{8}$/.test(field.value);
            errorMessage = 'Invalid mobile number format (07XXXXXXXX)';
            break;

        case 'passportNumber':
            isValid = /^[A-Z][0-9]{7,9}$/.test(field.value);
            errorMessage = 'Invalid passport format (1 letter followed by 7-9 digits)';
            break;

        case 'dateOfBirth':
            if (field.value) {
                const age = calculateAge(field.value);
                isValid = age >= 0;
                errorMessage = 'Date of birth cannot be in the future';
            } else {
                isValid = false;
                errorMessage = 'Date of birth is required';
            }
            break;

        case 'issueDate':
            if (field.value) {
                const issueDate = new Date(field.value);
                const today = new Date();
                isValid = issueDate <= today;
                errorMessage = 'Issue date cannot be in the future';
            } else {
                isValid = false;
                errorMessage = 'Issue date is required';
            }
            break;

        default:
            isValid = field.value.trim() !== '';
            errorMessage = `${field.getAttribute('placeholder') || 'This field'} is required`;
    }

    if (!isValid) {
        field.classList.add('error');
        errorDiv.textContent = errorMessage;
    }

    return isValid;
}

// Validate form
function validateForm() {
    let isValid = true;
    
    const requiredFields = [
        'companySearch',
        'customerCode',
        'town',
        'district',
        'participantName',
        'surname',
        'dateOfBirth',
        'mobileNumber',
        'passportNumber',
        'issueDate',
        'expiryDate',
        'tshirtSize',
        'relationshipStatus'
    ];

    requiredFields.forEach(fieldId => {
        if (!validateField(fieldId)) {
            isValid = false;
        }
    });

    const radioGroups = ['gender', 'mealPreference', 'additionalParticipants'];
    radioGroups.forEach(groupName => {
        const checked = document.querySelector(`input[name="${groupName}"]:checked`);
        const errorDiv = document.getElementById(`${groupName}Error`);
        
        if (!checked && errorDiv) {
            errorDiv.textContent = 'Please select an option';
            isValid = false;
        }
    });

    return isValid;
}

// Show success message
function showSuccessMessage() {
    const thankYouMessage = document.getElementById('thankYouMessage');
    const submissionTime = getSubmissionDateTime();
    
    thankYouMessage.innerHTML = `
        <div class="success-message">
            <div class="success-content">
                <div class="checkmark-circle">
                    <div class="checkmark"></div>
                </div>
                <h2 class="text-2xl font-bold text-green-700 mb-4">Thank You!</h2>
                <p class="text-gray-600 mb-6">
                    Your application has been successfully submitted.
                </p>
                <div class="submission-details p-4 bg-gray-50 rounded-lg mb-6">
                    <p class="text-sm text-gray-600">
                        <span class="font-medium">Submission Details:</span><br>
                        Submitted on: ${submissionTime} (Sri Lanka Time)<br>
                        Submitted by: ${document.getElementById('userLogin').textContent}
                    </p>
                </div>
                <button type="button" onclick="resetForm()" 
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Submit Another Application
                </button>
            </div>
        </div>
    `;
    thankYouMessage.classList.remove('hidden');
}

// Show/hide loading state
function showLoadingState(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const formInputs = document.getElementById('formInputs');
    const submitButton = document.querySelector('button[type="submit"]');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');

    if (show) {
        loadingOverlay.classList.add('visible');
        formInputs.style.opacity = '0.5';
        formInputs.style.pointerEvents = 'none';
        submitButton.disabled = true;
        buttonText.textContent = 'Processing...';
        spinner.classList.remove('hidden');
    } else {
        loadingOverlay.classList.remove('visible');
        formInputs.style.opacity = '1';
        formInputs.style.pointerEvents = 'auto';
        submitButton.disabled = false;
        buttonText.textContent = 'Submit Application';
        spinner.classList.add('hidden');
    }
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    showLoadingState(true);

    try {
        const form = document.getElementById('participantForm');
        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            if (['participantName', 'surname', 'otherNames', 'passportNumber'].includes(key)) {
                data[key] = value.trim().toUpperCase();
            } else {
                data[key] = value.trim();
            }
        }

        // Add submission metadata with Sri Lanka time
        data.submissionDateTime = getSubmissionDateTime();
        data.userLogin = document.getElementById('userLogin').textContent;

        const response = await fetch(
            `${SCRIPT_URL}?data=${encodeURIComponent(JSON.stringify(data))}`,
            {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.result === 'success') {
            document.getElementById('formInputs').style.display = 'none';
            showSuccessMessage();
        } else {
            const errorMessage = result.error;
            if (errorMessage.includes('(')) {
                const fieldName = errorMessage.split('(')[1].split(')')[0];
                const errorDiv = document.getElementById(`${fieldName}Error`);
                if (errorDiv) {
                    errorDiv.textContent = errorMessage.split('(')[0].trim();
                    const fieldElement = document.getElementById(fieldName);
                    if (fieldElement) {
                        fieldElement.classList.add('error');
                        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    alert(errorMessage);
                }
            } else {
                alert(errorMessage);
            }
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Error submitting form. Please try again or contact support.');
    } finally {
        showLoadingState(false);
    }
}

// Reset form
function resetForm() {
    const form = document.getElementById('participantForm');
    const formInputs = document.getElementById('formInputs');
    const thankYouMessage = document.getElementById('thankYouMessage');
    
    form.reset();
    
    // Clear all error messages and states
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    
    // Reset readonly fields
    ['customerCode', 'town', 'district', 'age', 'expiryDate'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });

    // Reset search results
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
    }
    
    formInputs.style.display = 'block';
    formInputs.style.opacity = '1';
    formInputs.style.pointerEvents = 'auto';
    thankYouMessage.classList.add('hidden');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize form listeners
function initializeFormListeners() {
    // Company search input listener
    const companySearchInput = document.getElementById('companySearch');
    if (companySearchInput) {
        companySearchInput.addEventListener('input', (e) => {
            searchCompanies(e.target.value);
        });
    }

    // Date of birth listener
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    if (dateOfBirthInput) {
        dateOfBirthInput.addEventListener('change', function() {
            const age = calculateAge(this.value);
            document.getElementById('age').value = age;
            validateField('dateOfBirth');
        });

        // Set max date to today
        const today = new Date().toISOString().split('T')[0];
        dateOfBirthInput.setAttribute('max', today);
    }

    // Issue date listener
    const issueDateInput = document.getElementById('issueDate');
    if (issueDateInput) {
        issueDateInput.addEventListener('change', function() {
            const expiryDate = calculateExpiry(this.value);
            document.getElementById('expiryDate').value = expiryDate;
            validateField('issueDate');
        });

        // Set max date to today
        const today = new Date().toISOString().split('T')[0];
        issueDateInput.setAttribute('max', today);
    }

    // Mobile number listener
    const mobileNumberInput = document.getElementById('mobileNumber');
    if (mobileNumberInput) {
        mobileNumberInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            validateField('mobileNumber');
            
            const errorDiv = document.getElementById('mobileNumberError');
            const mobileRegex = /^07[0-9]{8}$/;
            
            if (!mobileRegex.test(this.value)) {
                errorDiv.textContent = 'Invalid mobile number format (07XXXXXXXX)';
                this.classList.add('error');
            } else {
                errorDiv.textContent = '';
                this.classList.remove('error');
            }
        });

        mobileNumberInput.addEventListener('blur', function() {
            if (this.value && !/^07/.test(this.value)) {
                this.value = '07' + this.value;
            }
            validateField('mobileNumber');
        });
    }

    // Passport number listener with duplicate check
    const passportNumberInput = document.getElementById('passportNumber');
    if (passportNumberInput) {
        let timeoutId;
        
        passportNumberInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (!validateField('passportNumber')) {
                return;
            }

            const errorDiv = document.getElementById('passportNumberError');
            errorDiv.textContent = 'Checking passport number...';
            
            timeoutId = setTimeout(async () => {
                try {
                    const isDuplicate = await checkDuplicatePassport(this.value);
                    if (isDuplicate) {
                        errorDiv.textContent = 'This passport number is already registered';
                        this.classList.add('error');
                    } else {
                        errorDiv.textContent = '';
                        this.classList.remove('error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    errorDiv.textContent = 'Error checking passport number';
                    this.classList.add('error');
                }
            }, 500);
        });

        passportNumberInput.addEventListener('blur', function() {
            validateField('passportNumber');
        });
    }

    // Form submit listener
    const form = document.getElementById('participantForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        const searchResults = document.getElementById('searchResults');
        const companySearch = document.getElementById('companySearch');
        
        if (!event.target.closest('#companySearch') && 
            !event.target.closest('#searchResults')) {
            if (searchResults) {
                searchResults.style.display = 'none';
            }
        }
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeFormListeners();
});