// server.js - Enhanced Node.js Backend with Express and MongoDB
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use(express.static('public')); // Serve your HTML files from 'public' folder

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    type: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    createdAt: { type: Date, default: Date.now }
});

// Enhanced Product Schema with multiple images and detailed description
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true }, // Short description
    detailedDescription: { type: String, required: true }, // Detailed description
    mainImage: { type: String, required: true }, // Base64 main image
    subImages: [{ type: String }], // Array of base64 sub-images
    price: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Enhanced Order Schema
const orderSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    price: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    phone: { type: String, required: true },
    altPhone: { type: String },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    city: { type: String, required: true },
    taluka: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// Routes

// User Registration
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password, type } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            type
        });
        
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, type } = req.body;
        
        // Find user
        const user = await User.findOne({ email, type });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                type: user.type
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add product with multiple images (Admin only)
app.post('/api/products', async (req, res) => {
    try {
        const { name, description, detailedDescription, mainImage, subImages, price } = req.body;
        
        // Validate required fields
        if (!name || !description || !detailedDescription || !mainImage || !price) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (!subImages || subImages.length < 3) {
            return res.status(400).json({ error: 'At least 3 sub-images are required' });
        }
        
        const product = new Product({
            name,
            description,
            detailedDescription,
            mainImage,
            subImages,
            price: parseFloat(price)
        });
        
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update product (Admin only)
app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, description, detailedDescription, mainImage, subImages, price } = req.body;
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                detailedDescription,
                mainImage,
                subImages,
                price: parseFloat(price)
            },
            { new: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(updatedProduct);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete product (Admin only)
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Place order
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Validate required fields
        const requiredFields = ['productId', 'productName', 'price', 'customerName', 'customerEmail', 'phone', 'address', 'pincode', 'city', 'taluka'];
        for (let field of requiredFields) {
            if (!orderData[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        
        const order = new Order(orderData);
        await order.save();
        res.status(201).json({ message: 'Order placed successfully', orderId: order._id });
    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all orders (Admin only)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get orders by customer email
app.get('/api/orders/customer/:email', async (req, res) => {
    try {
        const orders = await Order.find({ customerEmail: req.params.email }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update order status (Admin only)
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(updatedOrder);
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete order (Admin only)
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create default admin user
async function createDefaultAdmin() {
    try {
        const adminExists = await User.findOne({ email: 'admin@admin.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                name: 'Admin',
                email: 'admin@admin.com',
                password: hashedPassword,
                type: 'admin'
            });
            await admin.save();
            console.log('Default admin user created - Email: admin@admin.com, Password: admin123');
        } else {
            console.log('Default admin user already exists');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await mongoose.connection.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    createDefaultAdmin();
});

module.exports = app;
