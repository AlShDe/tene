// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCemnQaxeAWovYg-tKRX2f7oFKwQupAcQo",
    authDomain: "tene-3855c.firebaseapp.com",
    projectId: "tene-3855c",
    storageBucket: "tene-3855c.appspot.com",
    messagingSenderId: "508014411785",
    appId: "1:508014411785:web:91ad329219c7563aa578d8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUserName = '';

// Function to handle user authentication
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("User signed in: ", userCredential.user);
        currentUserName = await getUserName(userCredential.user.uid);
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('date-form').style.display = 'block';
        document.querySelector('.history-controls').style.display = 'block';
        if (userCredential.user.email === 'alexandrarumsh@gmail.com') {
            document.getElementById('export-csv').style.display = 'block';
        } else {
            document.getElementById('export-csv').style.display = 'none';
        }
        document.getElementById('header').textContent = `האילוצים של ${currentUserName}`;
        loadDates(); // Load current month dates by default
    } catch (error) {
        console.error('Error signing in: ', error);
        alert(`Error signing in: ${error.message}`);
        if (error.code === 'auth/user-not-found') {
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                console.log("User registered: ", userCredential.user);
                await db.collection('users').doc(userCredential.user.uid).set({ name });
                currentUserName = name;
                document.getElementById('auth-form').style.display = 'none';
                document.getElementById('date-form').style.display = 'block';
                document.querySelector('.history-controls').style.display = 'block';
                if (userCredential.user.email === 'alexandrarumsh@gmail.com') {
                    document.getElementById('export-csv').style.display = 'block';
                } else {
                    document.getElementById('export-csv').style.display = 'none';
                }
                document.getElementById('header').textContent = `האילוצים של ${currentUserName}`;
                loadDates(); // Load current month dates by default
            } catch (registerError) {
                console.error('Error registering: ', registerError);
                alert(`Error registering: ${registerError.message}`);
            }
        }
    }
});

async function getUserName(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.exists ? userDoc.data().name : '';
}

// Function to submit date and name
document.getElementById('date-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('date').value;
    const user = auth.currentUser;
    if (!user) {
        alert('No user is signed in');
        return;
    }

    const selectedDate = new Date(date);
    const currentDate = new Date();
    const diffTime = selectedDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 4) {
        alert('לא ניתן להזין אילוץ אם נשארו 4 ימים או פחות עד התאריך המבוקש');
        return;
    }

    // Check if the date is already selected
    const existingDates = await db.collection('unavailableDates')
        .where('userId', '==', user.uid)
        .where('date', '==', date)
        .get();

    if (!existingDates.empty) {
        alert('תאריך זה כבר נבחר');
        return;
    }

    console.log("Submitting: ", { name: currentUserName, date, userId: user.uid });
    try {
        const docRef = await db.collection('unavailableDates').add({ name: currentUserName, date, userId: user.uid });
        console.log("Document written with ID: ", docRef.id);
        alert('תאריך נוסף בהצלחה!');
        loadDates(); // Reload dates after adding a new one
    } catch (e) {
        console.error('Error adding document: ', e);
        alert(`Error adding document: ${e.message}`);
    }
});

// Function to load dates and names
async function loadDates(showAll = false) {
    const datesList = document.getElementById('dates-list');
    datesList.innerHTML = '';
    const user = auth.currentUser;
    if (!user) {
        alert('No user is signed in');
        return;
    }

    let query = db.collection('unavailableDates').where('userId', '==', user.uid);

    if (!showAll) {
        const currentDate = new Date();
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        query = query.where('date', '>=', start.toISOString()).where('date', '<', end.toISOString());
    }

    try {
        const querySnapshot = await query.get();
        querySnapshot.forEach((doc) => {
            const li = document.createElement('li');
            li.textContent = `${doc.data().date} - ${doc.data().name}`;
            datesList.appendChild(li);
        });
    } catch (e) {
        console.error('Error getting documents: ', e);
        alert(`Error getting documents: ${e.message}`);
    }
}

// Function to load history by months
async function loadHistoryByMonths() {
    const user = auth.currentUser;
    if (!user) {
        alert('No user is signed in');
        return;
    }

    const monthButtonsDiv = document.getElementById('month-buttons');
    monthButtonsDiv.innerHTML = '';
    const datesList = document.getElementById('dates-list');
    datesList.innerHTML = '';

    try {
        const querySnapshot = await db.collection('unavailableDates')
            .where('userId', '==', user.uid)
            .orderBy('date')
            .get();

        const months = new Set();
        querySnapshot.forEach((doc) => {
            const date = new Date(doc.data().date);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            months.add(monthYear);
        });

        months.forEach(month => {
            const button = document.createElement('button');
            button.textContent = month;
            button.addEventListener('click', () => loadDatesByMonth(month));
            monthButtonsDiv.appendChild(button);
        });

        monthButtonsDiv.style.display = 'flex';

    } catch (e) {
        console.error('Error getting documents: ', e);
        alert(`Error getting documents: ${e.message}`);
    }
}

async function loadDatesByMonth(monthYear) {
    const datesList = document.getElementById('dates-list');
    datesList.innerHTML = '';
    const user = auth.currentUser;
    if (!user) {
        alert('No user is signed in');
        return;
    }

    try {
        const querySnapshot = await db.collection('unavailableDates')
            .where('userId', '==', user.uid)
            .orderBy('date')
            .get();

        querySnapshot.forEach((doc) => {
            const date = new Date(doc.data().date);
            const monthYearDoc = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (monthYearDoc === monthYear) {
                const li = document.createElement('li');
                li.textContent = `${doc.data().date} - ${doc.data().name}`;
                datesList.appendChild(li);
            }
        });
    } catch (e) {
        console.error('Error getting documents: ', e);
        alert(`Error getting documents: ${e.message}`);
    }
}

// Function to export data to CSV
async function exportToCSV() {
    const user = auth.currentUser;
    if (!user) {
        alert('No user is signed in');
        return;
    }

    // Check if the user is authorized
    if (user.email !== 'alexandrarumsh@gmail.com') {
        alert('רק למשתמש בעל המייל alexandrarumsh@gmail.com יש הרשאה לייצא את הנתונים.');
        return;
    }

    try {
        const querySnapshot = await db.collection('unavailableDates')
            .orderBy('date')
            .get();

        let csvContent = "data:text/csv;charset=utf-8,Date,Name\n";
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            csvContent += `${data.date},${data.name}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "unavailable_dates.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error('Error exporting data: ', e);
        alert(`Error exporting data: ${e.message}`);
    }
}

// Initial load
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUserName = await getUserName(user.uid);
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('date-form').style.display = 'block';
        document.querySelector('.history-controls').style.display = 'block';
        if (user.email === 'alexandrarumsh@gmail.com') {
            document.getElementById('export-csv').style.display = 'block';
        } else {
            document.getElementById('export-csv').style.display = 'none';
        }
        document.getElementById('header').textContent = `האילוצים של ${currentUserName}`;
        loadDates(); // Load current month dates by default
    } else {
        document.getElementById('auth-form').style.display = 'block';
        document.getElementById('date-form').style.display = 'none';
        document.querySelector('.history-controls').style.display = 'none';
        document.getElementById('export-csv').style.display = 'none';
    }
});

document.getElementById('view-all').addEventListener('click', () => loadDates(true));
document.getElementById('view-history').addEventListener('click', loadHistoryByMonths);
document.getElementById('export-csv').addEventListener('click', exportToCSV);

