import Property from "@/models/Property.model";

export const propertyResolver = {
  Query: {
    allProperties: async () => {
      return Property.find({});
    },
  },
};
