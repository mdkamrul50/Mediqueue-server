const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
dotenv.config();

const uri = process.env.MONGODB_URI;

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
   

    const db = client.db('Mediqueue');
    const tutorCollection = db.collection('tutors');
    const bookingCollection = db.collection('bookings');

    app.get('/tutors', async (req, res) => {
      const limit = parseInt(req.query.limit);

      const search = req.query.search || '';

      const startDate = req.query.startDate;

      const endDate = req.query.endDate;

      const query = {};

      // 🔍 SEARCH BY NAME
      if (search) {
        query.name = {
          $regex: search,
          $options: 'i',
        };
        console.log(search);
      }

      // 📅 FILTER BY DATE
if (startDate || endDate) {
  query.sessionDate = {};

  if (startDate) {
    query.sessionDate.$gte = startDate;
  }

  if (endDate) {
    query.sessionDate.$lte = endDate;
  }
}

      let cursor = tutorCollection.find(query);

      // LIMIT
      if (limit) {
        cursor = cursor.limit(limit);
      }

      const result = await cursor.toArray();

      res.send(result);
    });

    app.get('/tutors/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await tutorCollection.findOne(query);

      res.send(result);
    });

    app.get('/my-tutors/:userId', async (req, res) => {
      const userId = req.params.userId;

      const result = await tutorCollection.find({ userId }).toArray();

      res.send(result);
    });

    app.post('/tutors', async (req, res) => {
      try {
        const tutorData = req.body;
        tutorData.createdAt = new Date(); //deci kam

          if (!Array.isArray(tutorData.subject)) {
            tutorData.subject = [tutorData.subject];
          } //aikane o

  
        const result = await tutorCollection.insertOne(tutorData);

        res.status(201).json({
          success: true,
          message: 'Tutor added successfully',
          result,
        });
      } catch (error) {
        console.log(error);

        res.status(500).json({
          success: false,
          message: 'Failed to add tutor',
        });
      }
    });

    app.post('/booking', async (req, res) => {
      const bookingData = req.body;

      const tutorId = bookingData.tutorId;

      const tutor = await tutorCollection.findOne({
        _id: new ObjectId(tutorId),
      });

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: 'Tutor not found',
        });
      }

      if (tutor.slots <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No available slots left',
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessionDate = new Date(tutor.sessionDate);
      sessionDate.setHours(0, 0, 0, 0);

      if (today > sessionDate) {
        return res.status(400).json({
          success: false,
          message: 'Booking is not available yet for this tutor',
        });
      }

      const alreadyBooked = await bookingCollection.findOne({
        userId: bookingData.userId,
        tutorId: bookingData.tutorId,
      });

      if (alreadyBooked) {
        return res.status(400).json({
          success: false,
          message: 'You already booked this tutor',
        });
      }

      const result = await bookingCollection.insertOne(bookingData);

      await tutorCollection.updateOne(
        { _id: new ObjectId(tutorId) },
        { $inc: { slots: -1 } }
      );

      res.json({
        success: true,
        message: 'Booking successful',
        result,
      });
    });

    app.patch('/tutors/:id', async (req, res) => {
      const id = req.params.id;

      const updatedData = req.body;

      const result = await tutorCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updatedData,
        }
      );

      res.send(result);
    });

    app.delete('/tutors/:id', async (req, res) => {
      const id = req.params.id;

      const result = await tutorCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });
    app.get('/booking/:userId', async (req, res) => {
      const userId = req.params.userId;

      const result = await bookingCollection.find({ userId }).toArray();

      res.send(result);
    });

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server is running now');
});

app.listen(PORT, () => {
  console.log('server is running ', PORT);
});
