import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('marketplace Firestore configuration', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const indexes = JSON.parse(readFileSync('firestore.indexes.json', 'utf8')) as {
    indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string }> }>;
  };
  const firebase = JSON.parse(readFileSync('firebase.json', 'utf8')) as {
    firestore?: { rules?: string; indexes?: string };
  };

  it('requires authentication and fixes proposal terms across every state transition', () => {
    const marketplaceRules = rules.slice(rules.indexOf('match /marketplace_offers/{offerId}'));

    expect(marketplaceRules).toContain('allow create: if signedIn()');
    expect(marketplaceRules).toContain('allow update: if signedIn()');
    expect(marketplaceRules).toContain('marketplaceOfferTermsUnchanged()');
    expect(rules).toContain('request.auth.uid != resource.data.sellerUid');
    expect(rules).toContain('resource.data.reservedByUid == request.auth.uid');
    expect(rules).toContain('resource.data.sellerUid == request.auth.uid');
    expect(marketplaceRules).toContain('allow delete: if false');
  });

  it('marks records as non-binding proposals and never grants access to save inventory or gold', () => {
    expect(rules).toContain("offer.kind == 'non-binding-trade-proposal'");
    expect(rules).toContain('offer.askingPrice >= 1');
    expect(rules).toContain('offer.askingPrice <= 9999999');
    expect(rules).toContain('offer.enhancement <= 5');
    expect(rules).not.toContain('marketplaceOfferTermsUnchanged(snapshot');
    expect(rules).not.toContain('marketplaceOfferTermsUnchanged(gold');
  });

  it('ships the indexes used by public offers, seller history and buyer reservations', () => {
    expect(firebase.firestore).toMatchObject({
      rules: 'firestore.rules',
      indexes: 'firestore.indexes.json',
    });
    const signatures = indexes.indexes
      .filter((index) => index.collectionGroup === 'marketplace_offers')
      .map((index) => index.fields.map((field) => field.fieldPath).join(','));

    expect(signatures).toContain('status,createdAt');
    expect(signatures).toContain('status,itemId,askingPrice');
    expect(signatures).toContain('sellerUid,updatedAt');
    expect(signatures).toContain('status,reservedByUid,updatedAt');
  });
});
