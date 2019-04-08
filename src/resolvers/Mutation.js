//Dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { APP_SECRET, getUserId } = require("../utils");

// Add new user - SIGNUP
async function signup(parent, args, context, info) {
  // encrypting the User’s password
  const password = await bcrypt.hash(args.password, 10);

  // new User in DB with the fields that comming from args + crypted password
  const user = await context.prisma.createUser({ ...args, password });

  // Generating a JWT which is signed with an APP_SECRET
  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user
  };
}

// LOGIN
async function login(parent, args, context, info) {
  // Retrieving the existing User record by the email
  const user = await context.prisma.user({ email: args.email });
  if (!user) {
    throw new Error("No such user found");
  }

  // Comparing the provided password with the stored one in the database.
  const valid = await bcrypt.compare(args.password, user.password);
  if (!valid) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user
  };
}

// POST
function post(parent, args, context, info) {
  // Retrieving the ID of the User
  const userId = getUserId(context);
  return context.prisma.createLink({
    url: args.url,
    description: args.description,
    // connect =  nested object
    postedBy: { connect: { id: userId } }
  });
};

//VOTES
async function vote(parent, args, context, info) {
  // Validate the incoming JWT
  const userId = getUserId(context)

  // Takes a where filter object that allows to specify certain conditions about elements of that type
  const linkExists = await context.prisma.$exists.vote({
    user: { id: userId },
    link: { id: args.linkId },
  })
  if (linkExists) {
    throw new Error(`Already voted for link: ${args.linkId}`)
  }

  // Create a new Vote that’s connected to the User and the Link.
  return context.prisma.createVote({
    user: { connect: { id: userId } },
    link: { connect: { id: args.linkId } },
  })
}

module.exports = {
  signup,
  login,
  post,
  vote
};
