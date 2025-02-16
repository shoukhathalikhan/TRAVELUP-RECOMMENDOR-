


// app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const csv = require('csv-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt'); // For password hashing
const connectDB = require('./db'); // Import the database connection file
const User = require('./models/user'); // Import the User model
const MongoStore = require('connect-mongo'); // To store sessions in MongoDB
const multer = require('multer');
const chatRoutes = require('./routes/chatRoutes');
const recommendationRoutes=require('./routes/recommendationRoutes')



  // Correct path



const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', chatRoutes);
app.use('/api/rec',recommendationRoutes);
app.get('/chatbot', (req, res) => {
    res.render('chatbot');
});


// Session management
app.use(session({
    secret: 'a0ba3367dacfd7c1d859a2f3edf0140a5fc6ef9e968bd2987781fba9787dbff446362c23feffdbc334f61eb53da4d75a7804d7cba79f397caec06eb1857e0d03', // Change this to a secure secret
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost/travelscapes', // Ensure to replace with your MongoDB connection string
        collectionName: 'sessions' // Optional: Specify a collection name for sessions
    }),
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files from the 'public' directorys
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine to serve EJS files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // Set EJS as the view engine

// Serve the homepage
app.get('/', (req, res) => {
    res.render('index'); // Renders 'views/index.ejs'
});

// Serve login page
app.get('/login', (req, res) => {
    const successMessage = req.session.success;
    req.session.success = null; // Clear the message after displaying it
    res.render('login', { success: successMessage, error: null }); // Render 'views/login.ejs'
});

// Serve signup page
app.get('/signup', (req, res) => {
    res.render('signup'); // Render 'views/signup.ejs'
});

// Serve admin login page
app.get('/admin', (req, res) => {
    res.render('admin'); // Render 'views/admin.ejs'
});

app.get('/cities', (req, res) => {
    res.render('cities'); // Render 'views/admin.ejs'
});

app.get('/imagesearch', (req, res) => {
    res.render('imagesearch'); // Render 'views/admin.ejs'
});
app.get('/indexpage', (req, res) => {
    res.render('indexpage'); // Render 'views/admin.ejs'
});
// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next(); // User is authenticated, proceed to the next middleware
    }
    res.redirect('/login'); // Redirect to login if not authenticated
};

// Serve loggedinhome page
// Serve loggedinhome page
app.get('/loggedinhome', async (req, res) => {
    console.log(req.session); // Check if session contains userId

    if (!req.session.userId) {
        return res.redirect('/login'); // If not logged in, redirect to login page
    }

    try {
        // Fetch user details from MongoDB based on session's userId
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.redirect('/login'); // If user not found, redirect to login
        }

        // Pass the user data to the EJS view
        res.render('loggedinhome', { user });
    } catch (err) {
        console.error(err);
        res.redirect('/login'); // Handle error and redirect to login
    }
});

// Define your signup route
app.post('/signup', async (req, res) => {
    const { email, username, password, pwdconfirm } = req.body;

    // Check if passwords match
    if (password !== pwdconfirm) {
        return res.status(400).render('login', { error: "Passwords do not match.", success: null });
    }

    // Logic to save user data to MongoDB
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).render('login', { error: "User with this email or username already exists.", success: null });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, username, password: hashedPassword });
        await newUser.save();

        // Store a success message in the session
        req.session.success = 'User created successfully! You can now log in.';
        res.redirect('/login'); // Redirect to the login page
    } catch (error) {
        res.status(400).render('login', { error: error.message, success: null });
    }
});

// Define your login route
app.post('/login', async (req, res) => {
    const { uid, password } = req.body;

    // Logic for authenticating user
    try {
        const user = await User.findOne({ $or: [{ username: uid }, { email: uid }] });
        if (!user) {
            return res.status(400).render('login', { error: "Invalid username/email or password.", success: null });
        }

        // Compare the password with the stored hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).render('login', { error: "Invalid username/email or password.", success: null });
        }

        // Save user ID in session to persist login
        req.session.userId = user._id; // Ensure this line is present

        // Authentication successful, redirect to loggedinhome page
        res.redirect('/loggedinhome'); // Redirect to loggedinhome after successful login
    } catch (error) {
        res.status(500).render('login', { error: "Something went wrong. Please try again.", success: null });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid'); // Clears the session cookie
        return res.redirect('/login');  // Redirect to login page
    });
});

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Define the path to your CSV file
const csvFilePath = path.join(__dirname, 'city.csv');

// Route to render the cities.ejs page
app.get('/cities', (req, res) => {
    // Ensure cityData is always an array, even if no search has been performed yet
    res.render('cities', { cityData: [] }); // Pass an empty array initially
});

// Route to handle the city search
app.post('/cities', (req, res) => {
    const searchCity = req.body.city; // City input from the user

    // Read and parse the CSV file
    let cityData = [];
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            // Check if the city name matches the user input (case insensitive)
            if (row.city.toLowerCase() === searchCity.toLowerCase()) {
                cityData.push(row);
            }
        })
        .on('end', () => {
            // Render the cities.ejs template with the filtered city data
            res.render('cities', { cityData });
        });
});


app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));
app.set('view engine', 'ejs');

// Middleware to add user object to all routes
app.use((req, res, next) => {
    // This is a placeholder. In a real app, you'd get the user from the session
    res.locals.user = null; // or { username: 'exampleUser' } if you want to test the logged-in state
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('loggedinhome');
});

app.get('/search', (req, res) => {
    res.render('search');
});

app.get('/aboutus', (req, res) => {
    res.render('aboutus');
});

app.get('/layla_handling', (req, res) => {
    res.render('layla_handling');
});



app.get('/image_place', (req, res) => {
    res.render('image_place');
});

app.post('/search', (req, res) => {
    const { city, duration } = req.body;
    const results = [];

    fs.createReadStream(path.join(__dirname, 'city.csv'))
        .pipe(csv())
        .on('data', (row) => {
            if (
                (city && row.city && row.city.toLowerCase().includes(city.toLowerCase())) &&

                (!duration || row.ideal_duration.includes(duration))
            ) {
                results.push(row);
            }
        })
        .on('end', () => {
            res.render('search', { results });
        });
});

// Serve static files (if any)
app.use(express.static('public'));

// Route to render image upload page
app.get('/imagesearch', (req, res) => {
    res.render('imagesearch');  // Render the image search page (EJS template)
});

// Setting up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'queries/');  // Store files in the 'queries' folder
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Use original file name
    }
});
const upload = multer({ storage });

// Define views mapping based on image names
const views = {
    'Taj_Mahal': 'Taj_Mahal',
    'qutub_minar': 'main_copy_2',
    'Mysore_Palace': 'mysore',
    'jantar_mantar': 'jantar_mantar',
    'hawa_mahal': 'hawa_mahal',
    'red_fort': 'red_fort',
    'gateway': 'gateway_of_india',
    'lotus': 'lotus',
    'virupaksha_temple': 'virupaksha_temple',
    'gol_gumbaz': 'gol_gumbaz',
    'golden_temple': 'golden_temple',
    'jama_masjid': 'jama_masjid'
};

// Route to handle image upload and render the appropriate page
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }

        // Get the file name without extension
        const fileName = path.basename(req.file.originalname, path.extname(req.file.originalname));

        // Check if there's a matching view for the uploaded file name
        const matchedView = views[fileName];
        
        if (matchedView) {
            return res.render(matchedView);  // Render the matching view
        }

        // Render a default template if no match is found
        return res.render('image');  // Default template
    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send('Error during processing');
    }
});

app.use(express.static(path.join(__dirname, 'static')));


// Default route for the homepage
app.get('/', (req, res) => {
    res.render('loggedinhome');  // Render the homepage (indexpage.html)
});

app.post('/api/rec/recommendation', async (req, res) => {
    try {
        const { region, state, activity, subActivity } = req.body;

        // Validate inputs
        if (!region || !state || !activity || !subActivity) {
            req.session.success = false; // Indicate failure
            return res.status(400).json({ error: "All fields are required" });
        }

        // Simulate recommendation logic
        const recommendations = {
            destination_overview: `A wonderful place in ${state} for ${activity}.`,
            top_attractions: [
                { name: "Attraction 1", description: "A must-visit place." },
                { name: "Attraction 2", description: "Popular for scenic views." },
            ],
            travel_itinerary: [
                { day: 1, activities: ["Visit Attraction 1", "Enjoy local cuisine"] },
                { day: 2, activities: ["Explore Attraction 2", "Visit local markets"] },
            ],
            best_time_to_visit: "November to February",
            local_cuisine: ["Dish 1", "Dish 2"],
            additional_tips: ["Book in advance", "Carry warm clothes"],
        };

        req.session.success = true; // Indicate success
        return res.json({ recommendations });
    } catch (error) {
        console.error("Error processing request:", error);
        req.session.success = false; // Indicate failure
        res.status(500).json({ error: "Internal Server Error" });
    }
});

 
app.get('/trip-planner', (req, res) => {
    const regionStates = {
        North: ["Delhi", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Punjab", "Rajasthan", "Uttarakhand", "Uttar Pradesh"],
        South: ["Andhra Pradesh", "Karnataka", "Kerala", "Tamil Nadu", "Telangana"],
        East: ["Bihar", "Jharkhand", "Odisha", "West Bengal", "Sikkim"],
        West: ["Gujarat", "Maharashtra", "Goa"]
    };

    const activities = {
        Adventure: ["Trekking", "Rock Climbing", "Paragliding", "River Rafting", "Mountain Biking"],
        Cultural: ["Temple Visits", "Historical Sites", "Art Galleries", "Local Festivals", "Traditional Shows"],
        Relaxation: ["Beach Activities", "Spa & Wellness", "Nature Walks", "Yoga Retreats", "Meditation Centers"],
        Wildlife: ["Safari", "Bird Watching", "Nature Photography", "Animal Sanctuaries", "National Parks"]
    };

    res.render('trip-planner', { regionStates, activities });
});



// Change this part
app.get('/rajastan', (req, res) => {
    res.render('rajastan');
});
app.get('/manali', (req, res) => {
    res.render('manali');
});
app.get('/goa', (req, res) => {
    res.render('goa');
});
app.get('/chennai', (req, res) => {
    res.render('chennai');
});
app.get('/kerala', (req, res) => {
    res.render('kerala');
});
app.get('/ladakh', (req, res) => {
    res.render('ladakh');
});
app.get('/pune', (req, res) => {
    res.render('pune');
});
app.get('/mysorelog', (req, res) => {
    res.render('mysorelog');
});
app.get('/mumbai', (req, res) => {
    res.render('mumbai');
});
app.get('/sikkim', (req, res) => {
    res.render('sikkim');
});

app.get('/image_place', (req, res) => {
    res.render('image_place');
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

