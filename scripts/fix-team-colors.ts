import { PrismaClient } from "@prisma/client";
import { NPL_FRANCHISE_BRANDS, getFranchiseBrand } from "../src/lib/npl-franchises";

const prisma = new PrismaClient();

async function main() {
  console.log("Synchronizing NPL franchise & team brand colors in database...");
  const teams = await prisma.team.findMany({ include: { franchise: true } });
  
  for (const team of teams) {
    const brand = getFranchiseBrand(team.name);
    console.log(`Updating ${team.name} -> Primary: ${brand.primaryColor}, Secondary: ${brand.secondaryColor}, Theme: ${brand.themeName}`);
    
    await prisma.team.update({
      where: { id: team.id },
      data: {
        shortName: brand.shortName,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        accentColor: brand.accentColor,
        themeName: brand.themeName,
        slogan: brand.slogan,
        city: brand.city,
        logoUrl: team.logoUrl || brand.logoFallback,
      },
    });

    if (team.franchiseId) {
      await prisma.franchise.update({
        where: { id: team.franchiseId },
        data: {
          shortName: brand.shortName,
          ownerName: team.franchise.ownerName || brand.ownerName,
          website: team.franchise.website || brand.website,
          logoUrl: team.franchise.logoUrl || brand.logoFallback,
          address: team.franchise.address || `${brand.city}, Nepal`,
        },
      });
    }
  }

  console.log("Franchise & team brand synchronization complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
