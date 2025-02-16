 // Import necessary modules
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing

// Define the user schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

// Method to compare passwords during login
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to create a new user
userSchema.statics.createUser = async function (email, username, password) {
    try {
        // Check if a user with the same email or username already exists
        const existingUser = await this.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            throw new Error("User with this email or username already exists.");
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save the new user
        const newUser = new this({
            email,
            username,
            password: hashedPassword // Store hashed password
        });

        await newUser.save(); 
        return newUser;
    } catch (error) {
        throw new Error("Error creating user: " + error.message);
    }
};

// Create the User model from the schema
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
