const express = require("express");
const app = express();
const bcrypt = require('bcrypt');
const PORT = 5000;
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require('multer');
const path = require('path');
 
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
dotenv.config();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // Use unique filenames
  },
});

const upload = multer({ storage });


const uri = "mongodb+srv://Mern-Task-Admin:Mern-Task-Admin1234@cluster0.o1ht6xv.mongodb.net/Mern-Task?retryWrites=true&w=majority&appName=Cluster0"

const jwt = require("jsonwebtoken");
const { log } = require("console");

function generateJWT(user) {
  const token = jwt.sign(
    { userId: user._id, username: user.username }, // Payload
    process.env.JWT_SECRET, // Secret (set this in your .env file)
    { expiresIn: '1h' } // Token expiration
  );
  return token;
}

 
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const MernTask = client.db("Mern-Task");
    const productCollection = MernTask.collection("Products");
 
    const userCollection = MernTask.collection("user");



    // users related Api
    app.post('/api/auth/register', async (req, res) => {
      const { username, email, password } = req.body;

      try {
        // Check if user already exists
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object
        const newUser = { username, email, password: hashedPassword };

        // Insert the new user into the user collection
        const result = await userCollection.insertOne(newUser);

        // Generate a JWT token
        const token = jwt.sign(
          { id: result.insertedId, email },
          process.env.JWT_SECRET, // Use a secret key from .env
          { expiresIn: '1h' }
        );

        // Send the token in the response
        res.status(201).json({ token });
      } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
      }
    });
    
    
    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;

      try {
        // Check if user exists
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(400).json({ msg: 'User not found' });
        }

        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, email },
          process.env.JWT_SECRET, // Use a secret key from .env
          { expiresIn: '1h' }
        );

        // Send the token in the response
        res.json({ token });
      } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
      }
    });

  
    app.get('/getProducts', async (req, res) => {
      try {
        // Fetch all products from the database
        const products = await productCollection.find({}).toArray();
    
        if (!products.length) {
          return res.status(404).json({ message: 'No products found' });
        }
    
        res.status(200).json({
          message: 'Products retrieved successfully',
          products,
        });
      } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products', details: err.message });
      }
    });
    
    app.post('/addProduct', upload.single('image'), async (req, res) => {
      try {
        const { title, tags } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null; // URL to the uploaded file
    
        // Validate required fields
        if (!title || !tags || !image) {
          return res.status(400).json({ error: 'All fields (title, tags, image) are required' });
        }
    
        // Create the product object
        const product = { title, tags, image };
    
        // Insert into MongoDB
        const result = await productCollection.insertOne(product);
    
        res.status(200).json({
          message: 'Product added successfully',
          product,
          result,
        });
      } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ error: 'Failed to add product', details: err.message });
      }
    });
     
   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`server rinning on PORT ${PORT}`);
});
