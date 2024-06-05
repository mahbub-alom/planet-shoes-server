const express = require('express')
const app = express()
const cors = require("cors")
require("dotenv").config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken")

app.use(cors())
app.use(express.json())

const TokenVerify = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: "unauthorized access1" })
    }
    const token = authorization.split(" ")[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access2" })
        }
        req.decoded = decoded
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qud1tkv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const indexKeys = { productName: 1 };
        const indexOptions = { name: "productName" };
        const userCollection = client.db("planetshoes").collection("user")
        const productCollection = client.db("planetshoes").collection("product")
        const reviewsCollection = client.db("planetshoes").collection("reviews")



        app.get("/reviews", async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })

        //searching
        app.get('/searchProduct/:text', async (req, res) => {
            const searchText = req.params.text;
            const result = await productCollection.find({
                $or: [
                    { productName: { $regex: searchText, $options: "i" } },
                ]
            }).toArray();
            res.send(result);
        })



        //jwt
        app.post("/jwt", async (req, res) => {
            const userData = req.body;
            const token = jwt.sign(userData, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
            res.send({ token })
        })


        //new user saved on database
        app.post("/newUser", async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exists" })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.get("/user", TokenVerify, async (req, res) => {
            if (req?.query?.email !== req?.decoded?.email) {
                return res.status(403).send({ message: "unauthorized access" })
            }
            let query = {}
            if (req?.query?.email) {
                query = { email: req?.query?.email }
            }
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/updateUserInfo/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

        app.put("/updateUser/:id", TokenVerify, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedData = {
                $set: {
                    name: data.userName,
                    userPhone: data.userPhone,
                    email: data.userEmail,
                    userAddress: data.userAddress,
                }
            }
            const result = await userCollection.updateOne(query, updatedData, options);

            res.send(result);

        })

        //product related api
        app.post("/addproduct", TokenVerify, async (req, res) => {
            const data = req.body;
            const result = await productCollection.insertOne(data)
            res.send(result)
        })
        app.get("/getproduct", TokenVerify, async (req, res) => {
            if (req?.query?.email !== req?.decoded?.email) {
                return res.status(403).send({ message: "unauthorized access" })
            }
            let query = {}
            if (req?.query?.email) {
                query = { sellerEmail: req?.query?.email }
            }
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })
        app.get("/updateGetProduct/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })
        app.patch("/updateproduct/:id", TokenVerify, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedData = {
                $set: {
                    productName: data.productName,
                    sellerName: data.sellerName,
                    sellerEmail: data.sellerEmail,
                    availableProduct: parseInt(data.availableProduct),
                    price: parseInt(data.price),
                    description: data.description,
                    discount: parseInt(data.discount)
                }
            }
            const result = await productCollection.updateOne(query, updatedData);
            res.send(result);
        })

        app.delete("/deleteproduct/:id", TokenVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result);
        })

        app.get("/allproduct", async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})