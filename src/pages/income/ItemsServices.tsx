import { useState } from 'react';
import { ItemList } from '@/components/income/ItemList';

export const ItemsServices = () => {
  const [refreshSignal] = useState(0);

  return (
    <div className="mx-auto py-6">
      <ItemList refreshSignal={refreshSignal} />
    </div>
  );
};
