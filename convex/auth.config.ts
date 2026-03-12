// Tells Convex to validate Auth0 JWTs so ctx.auth.getUserIdentity() works
// in mutations called from authenticated dashboard clients.
//
// Set these as Convex environment variables:
//   bunx convex env set AUTH0_ISSUER_BASE_URL "https://your-tenant.us.auth0.com"
//   bunx convex env set AUTH0_CLIENT_ID "your-auth0-client-id"
//
// Convex validates the Auth0 ID token issued for this client.
export default {
  providers: [
    {
      domain: process.env.AUTH0_ISSUER_BASE_URL!,
      applicationID: process.env.AUTH0_CLIENT_ID!,
    },
  ],
};
